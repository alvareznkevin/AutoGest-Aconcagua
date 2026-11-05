import io
import json
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase


@override_settings(GETAPI_API_KEY='clave-de-prueba')
class ConsultaPatenteTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(get_user_model().objects.create_user(username='consulta'))
        self.url = '/api/vehiculos/consultar-patente/?patente=ab-cd12'

    @patch('vehiculos.patentes.urlopen')
    def test_normaliza_y_solo_devuelve_campos_tecnicos(self, abrir):
        abrir.return_value.__enter__.return_value = io.StringIO(json.dumps({'success': True, 'data': {'year': 2023, 'mileage': 0, 'color': 'ROJO', 'fuel': 'DIÉSEL', 'transmission': 'AUTOMATICA', 'model': {'name': 'MODELO', 'brand': {'name': 'MARCA'}, 'typeVehicle': {'name': 'CAMIONETA'}}, 'owner': 'No exponer', 'precio_venta': 1}}))
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['patente'], 'ABCD12')
        self.assertEqual(response.data['datos'], {'marca': 'MARCA', 'modelo': 'MODELO', 'anio': 2023, 'kilometraje': 0, 'color': 'ROJO', 'combustible': 'diesel', 'transmision': 'automatica', 'tipo': 'camioneta'})
        self.assertIn('ABCD12', abrir.call_args.args[0].full_url)
        self.assertEqual(abrir.call_args.kwargs['timeout'], 10)

    @patch('vehiculos.patentes.urlopen')
    def test_valida_antes_de_consultar(self, abrir):
        self.assertEqual(self.client.get('/api/vehiculos/consultar-patente/?patente=invalid').status_code, 400)
        abrir.assert_not_called()

    @override_settings(GETAPI_API_KEY='')
    @patch('vehiculos.patentes.urlopen')
    def test_sin_clave(self, abrir):
        self.assertEqual(self.client.get(self.url).status_code, 503)
        abrir.assert_not_called()

    @patch('vehiculos.patentes.urlopen')
    def test_errores_del_proveedor(self, abrir):
        for codigo, esperado in [(404, 404), (401, 502), (429, 429)]:
            abrir.side_effect = HTTPError('https://example.com', codigo, 'error', {}, None)
            self.assertEqual(self.client.get(self.url).status_code, esperado)
        abrir.side_effect = URLError('timeout')
        self.assertEqual(self.client.get(self.url).status_code, 502)

    @patch('vehiculos.patentes.urlopen')
    def test_respuesta_invalida(self, abrir):
        abrir.return_value.__enter__.return_value = io.StringIO('no json')
        self.assertEqual(self.client.get(self.url).status_code, 502)

    def test_requiere_autenticacion(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, 401)
