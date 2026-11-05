from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from finanzas.models import Movimiento

class EliminacionTests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(username='admin', is_staff=True)
        self.cliente = Cliente.objects.create(nombre='Prueba', correo='prueba@example.com', telefono='123', preferencia='Auto')
        self.vehiculo = Vehiculo.objects.create(patente='ABCD12', marca='Marca', modelo='Modelo', anio=2023, tipo='automovil', color='Blanco', kilometraje=100, combustible='bencina', transmision='manual', precio_compra=8000000, precio_venta=10000000)
        self.urls = [f'/api/clientes/{self.cliente.pk}/', f'/api/vehiculos/{self.vehiculo.pk}/']

    def test_elimina_sin_movimientos(self):
        self.client.force_authenticate(self.admin)
        for url in self.urls:
            self.assertEqual(self.client.delete(url).status_code, 204)
            self.assertEqual(self.client.get(url).status_code, 404)

    def test_protege_movimientos_incluso_excluidos(self):
        self.client.force_authenticate(self.admin)
        movimiento = Movimiento.objects.create(vehiculo=self.vehiculo, tipo='gasto', monto=1000, descripcion='Reparacion', eliminado=True)
        self.assertEqual(self.client.delete(self.urls[1]).status_code, 409)
        self.assertTrue(Vehiculo.objects.filter(pk=self.vehiculo.pk).exists())
        self.assertTrue(Movimiento.objects.filter(pk=movimiento.pk).exists())

    def test_anonimo_no_elimina(self):
        for url in self.urls:
            self.assertEqual(self.client.delete(url).status_code, 401)
        self.assertTrue(Cliente.objects.filter(pk=self.cliente.pk).exists())
        self.assertTrue(Vehiculo.objects.filter(pk=self.vehiculo.pk).exists())

    def test_cliente_requiere_admin(self):
        self.client.force_authenticate(get_user_model().objects.create_user(username='usuario'))
        self.assertEqual(self.client.delete(self.urls[0]).status_code, 403)
        self.assertTrue(Cliente.objects.filter(pk=self.cliente.pk).exists())
