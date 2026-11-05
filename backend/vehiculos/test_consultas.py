import io
import json
from unittest.mock import patch
from urllib.error import HTTPError

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import Vehiculo
from .patentes import consultar_recalls, ErrorPatente


@override_settings(GETAPI_API_KEY='prueba')
class ConsultasVehiculoTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.client.force_authenticate(get_user_model().objects.create_user(username='operador'))
        self.vehiculo = Vehiculo.objects.create(patente='ABCD12', marca='Marca', modelo='Modelo', anio=2023, tipo='automovil', color='Blanco', kilometraje=100, combustible='bencina', transmision='manual', precio_compra=8000000, precio_venta=10000000, vin='LS5A3DKE5PA992049')
        self.base = f'/api/vehiculos/{self.vehiculo.pk}/'

    @patch('vehiculos.patentes.urlopen')
    def test_tasacion_persistida_sin_modificar_precios(self, abrir):
        abrir.return_value.__enter__.return_value = io.StringIO(json.dumps({'success': True, 'data': {'informacionFiscal': {'tasacion': '7000000', 'ano_info_fiscal': 2026}, 'precioUsado': {'precio': 11000000, 'banda_min': 10000000, 'banda_max': 12000000}, 'precioRetoma': None}}))
        response = self.client.post(self.base + 'consultas/tasacion/')
        self.assertEqual(response.status_code, 200)
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.tasacion['datos']['referencia'], 11000000)
        self.assertIsNone(self.vehiculo.tasacion['datos']['retoma'])
        self.assertIn('consultado', self.vehiculo.tasacion)
        self.assertEqual(int(self.vehiculo.precio_venta), 10000000)
        self.assertEqual(int(self.vehiculo.precio_compra), 8000000)
        self.assertEqual(self.client.get(self.base).data['tasacion'], self.vehiculo.tasacion)

    @patch('vehiculos.patentes.urlopen')
    def test_ficha_ampliada_y_cambio_vin_invalida_recalls(self, abrir):
        self.vehiculo.recalls = {'vin': self.vehiculo.vin, 'campanias': []}
        self.vehiculo.save()
        abrir.return_value.__enter__.return_value = io.StringIO(json.dumps({'success': True, 'data': {'vinNumber': 'LJXCU2BB0PTF03021', 'engineNumber': 'M123', 'version': 'AUT', 'engine': '1500', 'doors': 5}}))
        response = self.client.post(self.base + 'consultas/ficha/')
        self.assertEqual(response.status_code, 200)
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.numero_motor, 'M123')
        self.assertEqual(self.vehiculo.puertas, 5)
        self.assertIsNotNone(self.vehiculo.ficha_consultada)
        self.assertIsNone(self.vehiculo.recalls)
        self.assertEqual(self.vehiculo.marca, 'Marca')

    @patch('vehiculos.patentes.urlopen')
    def test_recall_sanitiza_enlaces_y_persiste(self, abrir):
        abrir.return_value.__enter__.return_value = io.StringIO(json.dumps({'success': True, 'data': [{'campaignCode': 'C123', 'urlDetalle': 'javascript:alert(1)', 'pdfUrl': 'https://www.seguridaddeproductos.cl/campania.pdf'}]}))
        response = self.client.post(self.base + 'consultas/recalls/')
        self.assertEqual(response.status_code, 200)
        campania = response.data['recalls']['campanias'][0]
        self.assertEqual(campania['detalle'], '')
        self.assertTrue(campania['pdf'].startswith('https://'))
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.recalls['vin'], self.vehiculo.vin)

    @patch('vehiculos.patentes.urlopen')
    def test_solo_404_documentado_se_interpreta_sin_campanias(self, abrir):
        abrir.side_effect = HTTPError('https://example.com', 404, 'not found', {}, io.BytesIO(b'{"success":true,"status":404,"data":null}'))
        self.assertEqual(consultar_recalls(self.vehiculo.vin)['campanias'], [])
        abrir.side_effect = HTTPError('https://example.com', 404, 'not found', {}, io.BytesIO(b'not found'))
        with self.assertRaises(ErrorPatente):
            consultar_recalls(self.vehiculo.vin)

    @patch('vehiculos.patentes.urlopen')
    def test_error_conserva_tasacion_anterior(self, abrir):
        self.vehiculo.tasacion = {'datos': {'referencia': 10}}
        self.vehiculo.save()
        abrir.side_effect = TimeoutError()
        self.assertEqual(self.client.post(self.base + 'consultas/tasacion/').status_code, 502)
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.tasacion['datos']['referencia'], 10)

    @patch('vehiculos.patentes.urlopen')
    def test_no_inventa_ceros_para_tasacion_vacia(self, abrir):
        abrir.return_value.__enter__.return_value = io.StringIO('{"success":true,"data":{}}')
        self.assertEqual(self.client.post(self.base + 'consultas/tasacion/').status_code, 404)

    def test_cambio_identidad_descarta_consultas_y_no_acepta_resultados_del_cliente(self):
        self.vehiculo.tasacion = {'datos': {}}
        self.vehiculo.recalls = {'campanias': []}
        self.vehiculo.save()
        response = self.client.patch(self.base, {'patente': 'ZZZZ99', 'tasacion': {'datos': {'referencia': 1}}}, format='json')
        self.assertEqual(response.status_code, 200)
        self.vehiculo.refresh_from_db()
        self.assertIsNone(self.vehiculo.tasacion)
        self.assertIsNone(self.vehiculo.recalls)

    @patch('vehiculos.patentes.urlopen')
    def test_vin_invalido_y_autenticacion(self, abrir):
        self.vehiculo.vin = ''
        self.vehiculo.save()
        self.assertEqual(self.client.post(self.base + 'consultas/recalls/').status_code, 400)
        abrir.assert_not_called()
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.base + 'consultas/tasacion/').status_code, 401)
