"""Consulta técnica de GetAPI Chile, exclusivamente desde el servidor."""
import json
import re
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.utils import timezone
from urllib.parse import urlparse


class ErrorPatente(Exception):
    def __init__(self, mensaje, status):
        self.mensaje = mensaje
        self.status = status


def normalizar(texto):
    return ''.join(c for c in unicodedata.normalize('NFD', str(texto)) if not unicodedata.combining(c)).lower().strip()


def validar_patente(patente):
    patente = re.sub(r'[\s-]', '', patente).upper()
    if not re.fullmatch(r'(?:[A-Z]{2}\d{4}|[A-Z]{4}\d{2})', patente):
        raise ErrorPatente('Ingresa una patente chilena válida: AB1234 o ABCD12.', 400)
    return patente


def solicitar(recurso, identificador, recall=False):
    if not settings.GETAPI_API_KEY:
        raise ErrorPatente('La consulta de patentes aún no está configurada. Puedes completar los datos manualmente.', 503)
    request = Request(f'https://chile.getapi.cl/v1/vehicles/{recurso}/{identificador}', headers={'X-Api-Key': settings.GETAPI_API_KEY, 'Accept': 'application/json', 'User-Agent': 'AutoGest-Aconcagua/1.0'})
    try:
        with urlopen(request, timeout=10) as response:
            payload = json.load(response)
    except HTTPError as error:
        if recall and error.code == 404:
            try:
                ausencia = json.load(error)
            except (ValueError, OSError):
                ausencia = None
            if isinstance(ausencia, dict) and ausencia.get('success') is True and ausencia.get('data') is None:
                return None
        mensajes = {404: ('No se encontraron datos para esta patente.', 404), 422: ('El proveedor rechazó el formato de la patente.', 400), 429: ('Se alcanzó el límite de consultas. Intenta más tarde.', 429)}
        mensaje, status = mensajes.get(error.code, ('El servicio de patentes no está disponible. Puedes completar los datos manualmente.', 502))
        raise ErrorPatente(mensaje, status) from error
    except (URLError, TimeoutError, OSError, ValueError) as error:
        raise ErrorPatente('No fue posible consultar la patente. Intenta nuevamente o completa los datos manualmente.', 502) from error
    if not isinstance(payload, dict) or payload.get('success') is not True:
        raise ErrorPatente('El proveedor no devolvió datos válidos para esta patente.', 502)
    return payload.get('data')


def consultar_patente(patente):
    patente = validar_patente(patente)
    data = solicitar('plate', patente)
    if not isinstance(data, dict):
        raise ErrorPatente('El proveedor no devolvió datos válidos para esta patente.', 502)
    model = data.get('model') if isinstance(data.get('model'), dict) else {}
    brand = model.get('brand') if isinstance(model.get('brand'), dict) else {}
    tipo = model.get('typeVehicle') if isinstance(model.get('typeVehicle'), dict) else {}
    resultado = {}
    for campo, valor, limite in [('marca', brand.get('name'), 50), ('modelo', model.get('name'), 100), ('color', data.get('color'), 50), ('vin', data.get('vinNumber'), 50), ('numero_motor', data.get('engineNumber'), 100), ('version', data.get('version'), 150), ('cilindrada', data.get('engine'), 50)]:
        if isinstance(valor, str) and 0 < len(valor.strip()) <= limite:
            resultado[campo] = valor.strip()
    for campo, valor, minimo, maximo in [('anio', data.get('year'), 1886, 2200), ('kilometraje', data.get('mileage'), 0, 2147483647), ('puertas', data.get('doors'), 1, 20)]:
        if not isinstance(valor, bool) and str(valor).isdigit() and minimo <= int(valor) <= maximo:
            resultado[campo] = int(valor)
    equivalencias = {
        'tipo': (tipo.get('name', ''), {'automovil': 'automovil', 'sedan': 'automovil', 'hatchback': 'automovil', 'camioneta': 'camioneta', 'camion': 'camion'}),
        'combustible': (data.get('fuel', ''), {'bencina': 'bencina', 'gasolina': 'bencina', 'diesel': 'diesel', 'electrico': 'electrico', 'hibrido': 'hibrido'}),
        'transmision': (data.get('transmission', ''), {'manual': 'manual', 'mecanica': 'manual', 'automatica': 'automatica'}),
    }
    for campo, (valor, opciones) in equivalencias.items():
        if normalizar(valor) in opciones:
            resultado[campo] = opciones[normalizar(valor)]
    return {'patente': patente, 'datos': resultado, 'fuente': 'GetAPI Chile'}


def monto(valor):
    if isinstance(valor, bool):
        return None
    try:
        numero = int(str(valor))
    except (ValueError, TypeError):
        return None
    return numero if 0 < numero <= 999999999999 else None


def consultar_tasacion(patente):
    patente = validar_patente(patente)
    data = solicitar('appraisal', patente)
    if not isinstance(data, dict):
        raise ErrorPatente('No hay una tasación válida disponible.', 502)
    fiscal = data.get('informacionFiscal') if isinstance(data.get('informacionFiscal'), dict) else {}
    usado = data.get('precioUsado') if isinstance(data.get('precioUsado'), dict) else {}
    datos = {'fiscal': monto(fiscal.get('tasacion')), 'anio_fiscal': monto(fiscal.get('ano_info_fiscal')), 'referencia': monto(usado.get('precio')), 'minimo': monto(usado.get('banda_min')), 'maximo': monto(usado.get('banda_max')), 'retoma': monto(data.get('precioRetoma'))}
    if datos['anio_fiscal'] is not None and not 1900 <= datos['anio_fiscal'] <= 2200:
        datos['anio_fiscal'] = None
    if all(datos[campo] is None for campo in ['fiscal', 'referencia', 'minimo', 'maximo', 'retoma']):
        raise ErrorPatente('El proveedor no tiene valores de tasación para este vehículo.', 404)
    if datos['minimo'] is not None and datos['maximo'] is not None and datos['minimo'] > datos['maximo']:
        datos['minimo'] = datos['maximo'] = None
    return {'patente': patente, 'datos': datos, 'fuente': 'GetAPI Chile', 'consultado': timezone.now().isoformat()}


def enlace_seguro(valor):
    if not isinstance(valor, str):
        return ''
    url = urlparse(valor)
    return valor if url.scheme == 'https' and url.hostname and not url.username and not url.password else ''


def consultar_recalls(vin):
    vin = vin.strip().upper()
    if not re.fullmatch(r'[A-HJ-NPR-Z0-9]{17}', vin):
        raise ErrorPatente('Guarda un VIN válido de 17 caracteres para consultar campañas.', 400)
    data = solicitar('recall', vin, recall=True)
    if data is None:
        data = []
    if not isinstance(data, list) or any(not isinstance(fila, dict) for fila in data):
        raise ErrorPatente('El proveedor devolvió una respuesta de campañas inválida.', 502)
    campañas = []
    for fila in data:
        campaña = {campo: str(fila.get(original) or '')[:500] for campo, original in [('codigo', 'campaignCode'), ('marca', 'brand'), ('modelo', 'model'), ('periodo', 'salesPeriod')]}
        campaña['detalle'] = enlace_seguro(fila.get('urlDetalle'))
        campaña['pdf'] = enlace_seguro(fila.get('pdfUrl'))
        campañas.append(campaña)
    return {'vin': vin, 'campanias': campañas, 'fuente': 'GetAPI Chile', 'consultado': timezone.now().isoformat()}
