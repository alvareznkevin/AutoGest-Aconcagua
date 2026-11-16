import io
import json
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase
from clientes.models import Cliente
from clientes.recomendaciones import ErrorRecomendacion, consultar_ia
from vehiculos.models import Vehiculo

@override_settings(GROQ_API_KEY='clave-prueba')
class RecomendacionesTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = get_user_model().objects.create_user(username='admin', is_staff=True)
        self.client.force_authenticate(self.admin)
        self.cliente = Cliente.objects.create(nombre='Nombre privado', correo='privado@example.com', telefono='123456', preferencia='Busco un automático')
        self.url = f'/api/clientes/{self.cliente.pk}/recomendaciones/'
        self.v = Vehiculo.objects.create(patente='ABCD12', marca='Marca', modelo='Modelo', anio=2023, tipo='automovil', color='Blanco', kilometraje=100, combustible='bencina', transmision='automatica', precio_compra=8000000, precio_venta=10000000)
        self.criterios = {'preferencias': 'Busco un automático', 'presupuesto_maximo': 11000000, 'transmision': 'automatica'}

    @patch('clientes.recomendaciones.consultar_ia')
    def test_inventario_real_y_sugerencias_sin_modificar_registros(self, ia):
        ia.return_value = {'inventario': [{'id': self.v.pk, 'motivo': 'Transmisión automática'}], 'externos': [{'marca': 'Otra', 'modelo': 'Opción', 'motivo': 'Para evaluar', 'verificar': ['Cotizar versión y precio']}]}
        response = self.client.post(self.url, self.criterios)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['inventario'][0]['precio_venta'], 10000000)
        self.assertEqual(response.data['externos'][0]['marca'], 'Otra')
        enviado = json.dumps(ia.call_args.args[0])
        for privado in ['Nombre privado', 'privado@example.com', '123456', 'ABCD12', 'precio_compra']:
            self.assertNotIn(privado, enviado)
        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.preferencia, 'Busco un automático')
        self.assertEqual(Vehiculo.objects.count(), 1)

    @patch('clientes.recomendaciones.consultar_ia')
    def test_filtra_presupuesto_transmision_y_estado(self, ia):
        ia.return_value = {'inventario': [], 'externos': []}
        self.criterios['presupuesto_maximo'] = 9000000
        self.assertEqual(self.client.post(self.url, self.criterios).status_code, 200)
        self.assertEqual(ia.call_args.args[0]['candidatos'], [])
        self.criterios['presupuesto_maximo'] = 11000000
        self.criterios['transmision'] = 'manual'
        self.client.post(self.url, self.criterios)
        self.assertEqual(ia.call_args.args[0]['candidatos'], [])
        self.v.estado = 'reservado'; self.v.save()
        self.criterios['transmision'] = 'automatica'
        self.client.post(self.url, self.criterios)
        self.assertEqual(ia.call_args.args[0]['candidatos'], [])

    @patch('clientes.recomendaciones.consultar_ia')
    def test_rechaza_ids_inventados(self, ia):
        ia.return_value = {'inventario': [{'id': 999999, 'motivo': 'Inventado'}], 'externos': []}
        self.assertEqual(self.client.post(self.url, self.criterios).status_code, 502)

    @override_settings(GROQ_API_KEY='')
    def test_sin_clave_no_inventa_resultados(self):
        response = self.client.post(self.url, self.criterios)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('inventario', response.data)

    @patch('clientes.recomendaciones.consultar_ia')
    def test_validacion_y_permisos_antes_de_consumir_ia(self, ia):
        self.assertEqual(self.client.post(self.url, {'preferencias': '', 'presupuesto_maximo': -1}).status_code, 400)
        self.client.force_authenticate(get_user_model().objects.create_user(username='operador'))
        self.assertEqual(self.client.post(self.url, self.criterios).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.url, self.criterios).status_code, 401)
        ia.assert_not_called()

    @patch('clientes.recomendaciones.urlopen')
    def test_json_invalido_y_respuesta_incompleta(self, abrir):
        for texto in ['no es json', json.dumps({'inventario': [{'id': 1}], 'externos': []})]:
            abrir.return_value.__enter__.return_value = io.BytesIO(json.dumps({'choices': [{'finish_reason': 'stop', 'message': {'content': texto}}]}).encode())
            with self.assertRaises(ErrorRecomendacion):
                consultar_ia({})

    @patch('clientes.recomendaciones.urlopen')
    def test_contrato_rest_y_json_valido(self, abrir):
        texto = json.dumps({'inventario': [], 'externos': []})
        abrir.return_value.__enter__.return_value = io.BytesIO(json.dumps({'choices': [{'finish_reason': 'stop', 'message': {'content': texto}}]}).encode())
        self.assertEqual(consultar_ia({}), {'inventario': [], 'externos': []})
        request = abrir.call_args.args[0]
        self.assertNotIn('clave-prueba', request.full_url)
        self.assertEqual(request.full_url, 'https://api.groq.com/openai/v1/chat/completions')
        payload = json.loads(request.data)
        self.assertEqual(payload['model'], 'openai/gpt-oss-120b')
        self.assertTrue(payload['response_format']['json_schema']['strict'])
        self.assertFalse(payload['response_format']['json_schema']['schema']['additionalProperties'])
        self.assertEqual(payload['max_completion_tokens'], 2048)

    @patch('clientes.recomendaciones.consultar_ia')
    def test_revalida_disponibilidad_tras_respuesta(self, ia):
        def cambiar(*args):
            Vehiculo.objects.filter(pk=self.v.pk).update(estado='reservado')
            return {'inventario': [{'id': self.v.pk, 'motivo': 'Antes disponible'}], 'externos': []}
        ia.side_effect = cambiar
        self.assertEqual(self.client.post(self.url, self.criterios).data['inventario'], [])


    @patch('clientes.recomendaciones.urlopen')
    def test_error_distingue_modelo_y_clave_sin_revelar_proveedor(self, abrir):
        from urllib.error import HTTPError
        casos = [(404, {}, 'modelo'), (401, {}, 'clave'), (403, {}, 'acceso'), (400, {}, 'HTTP 400')]
        for codigo, datos, mensaje in casos:
            datos['message'] = 'secreto-no-publicar'
            abrir.side_effect = HTTPError('https://example.com', codigo, 'error', {}, io.BytesIO(json.dumps({'error': datos}).encode()))
            with self.assertRaises(ErrorRecomendacion) as contexto:
                consultar_ia({})
            self.assertIn(mensaje, contexto.exception.mensaje)
            self.assertNotIn('secreto-no-publicar', contexto.exception.mensaje)


    @patch('clientes.recomendaciones.consultar_ia')
    def test_limita_quince_y_prioriza_preferencias(self, ia):
        ia.return_value = {'inventario': [], 'externos': []}
        for i in range(20):
            Vehiculo.objects.create(patente=f'AB{i:04d}', marca='Otra', modelo='Modelo', anio=2020, tipo='automovil', color='Azul', kilometraje=1000, combustible='bencina', transmision='automatica', precio_compra=1, precio_venta=5000000, descripcion='x' * 1000)
        self.v.marca = 'Preferida'; self.v.save()
        self.criterios['preferencias'] = 'Busco marca Preferida'
        response = self.client.post(self.url, self.criterios)
        self.assertEqual(response.status_code, 200)
        candidatos = ia.call_args.args[0]['candidatos']
        self.assertLessEqual(len(candidatos), 15)
        self.assertEqual(candidatos[0]['id'], self.v.pk)
        self.assertTrue(all(len(f['descripcion']) <= 120 for f in candidatos))
        self.assertLessEqual(len(json.dumps(ia.call_args.args[0], ensure_ascii=False, separators=(',', ':'))), 10000)
        self.assertEqual(response.data['total_candidatos'], 21)

    @patch('clientes.recomendaciones.urlopen')
    def test_respuesta_truncada_no_se_muestra_como_completa(self, abrir):
        abrir.return_value.__enter__.return_value = io.BytesIO(json.dumps({'choices': [{'finish_reason': 'length', 'message': {'content': '{}'}}]}).encode())
        with self.assertRaises(ErrorRecomendacion):
            consultar_ia({})

    @patch('clientes.recomendaciones.consultar_ia')
    def test_inventario_no_oculta_explica_externos_vacios(self, ia):
        ia.return_value = {'inventario': [{'id': self.v.pk, 'motivo': 'Coincide'}], 'externos': [], 'explicacion_inventario': 'Disponible', 'explicacion_externos': 'Las restricciones son incompatibles; revisa el presupuesto.'}
        response = self.client.post(self.url, self.criterios)
        self.assertEqual(len(response.data['inventario']), 1)
        self.assertEqual(response.data['externos'], [])
        self.assertIn('restricciones', response.data['explicacion_externos'])

    @patch('clientes.recomendaciones.consultar_ia')
    def test_informa_sugerencias_externas_descartadas_por_duplicadas(self, ia):
        ia.return_value = {'inventario': [], 'externos': [{'marca': self.v.marca, 'modelo': self.v.modelo, 'motivo': 'Mismo', 'verificar': ['Versión']}], 'explicacion_externos': 'Encontré una alternativa'}
        response = self.client.post(self.url, self.criterios)
        self.assertEqual(response.data['externos'], [])
        self.assertIn('repetían modelos', response.data['explicacion_externos'])

    @patch('clientes.recomendaciones.urlopen')
    def test_contrato_exige_explicacion_de_ambas_secciones(self, abrir):
        texto = json.dumps({'inventario': [], 'externos': [], 'explicacion_inventario': 'Sin candidatos', 'explicacion_externos': 'Revisar criterios'})
        abrir.return_value.__enter__.return_value = io.BytesIO(json.dumps({'choices': [{'finish_reason': 'stop', 'message': {'content': texto}}]}).encode())
        resultado = consultar_ia({})
        payload = json.loads(abrir.call_args.args[0].data)
        required = payload['response_format']['json_schema']['schema']['required']
        self.assertIn('explicacion_externos', required)
        self.assertIn('explicacion_inventario', required)
        self.assertIn('dos tareas independientes', payload['messages'][0]['content'])
        self.assertEqual(resultado['explicacion_externos'], 'Revisar criterios')
