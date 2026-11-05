from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Cliente


class EditarClienteTests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(username='administrador', is_staff=True)
        self.cliente = Cliente.objects.create(nombre='Ana', correo='ana@example.com', telefono='123456789', preferencia='SUV')
        self.url = f'/api/clientes/{self.cliente.pk}/'

    def test_administrador_puede_consultar_y_editar(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(self.url).data['nombre'], 'Ana')
        response = self.client.patch(self.url, {'nombre': 'Ana Pérez', 'preferencia': 'Automático'})
        self.assertEqual(response.status_code, 200)
        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.nombre, 'Ana Pérez')
        self.assertEqual(self.cliente.preferencia, 'Automático')
        self.assertEqual(self.cliente.correo, 'ana@example.com')

    def test_usuario_sin_permisos_no_puede_editar(self):
        usuario = get_user_model().objects.create_user(username='usuario')
        self.client.force_authenticate(usuario)
        self.assertEqual(self.client.patch(self.url, {'nombre': 'Otro'}).status_code, 403)
        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.nombre, 'Ana')

    def test_validacion_y_cliente_inexistente(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(self.url, {'correo': 'invalido'}).status_code, 400)
        self.assertEqual(self.client.get('/api/clientes/999999/').status_code, 404)
