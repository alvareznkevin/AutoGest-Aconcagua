from datetime import date
from unittest.mock import patch
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from .models import Movimiento


class DashboardTests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(username='dueno', is_staff=True)
        self.client.force_authenticate(self.admin)
        self.reloj = patch('finanzas.views.timezone.localdate', return_value=date(2026, 1, 15))
        self.reloj.start()
        self.addCleanup(self.reloj.stop)

    def vehiculo(self, patente, estado, compra):
        return Vehiculo.objects.create(patente=patente, marca='Marca', modelo='Modelo', anio=2023, tipo='automovil', color='Blanco', kilometraje=100, combustible='bencina', transmision='manual', precio_compra=compra, precio_venta=9000000, estado=estado)

    def test_solo_venta_genera_ingreso_y_stock_no_genera_gastos(self):
        self.vehiculo('AAAA11', 'disponible', 4000000)
        self.vehiculo('BBBB22', 'reservado', 5000000)
        self.vehiculo('CCCC33', 'vendido', 6000000)
        Cliente.objects.create(nombre='Ana', correo='ana@example.com', telefono='123', preferencia='SUV')
        data = self.client.get('/api/finanzas/dashboard/').data
        self.assertEqual(data['stock'], 2)
        self.assertEqual(data['inventario'], {'disponible': 1, 'reservado': 1, 'vendido': 1})
        self.assertEqual(data['inversion_stock'], 9000000)
        self.assertEqual(data['clientes'], 1)
        self.assertEqual(data['ingresos'], 9000000)
        self.assertEqual(data['gastos'], 0)
        self.assertEqual(data['cantidad_movimientos'], 1)

    def test_fechas_sumas_y_meses_sin_datos_al_cambiar_de_ano(self):
        for tipo, monto, fecha in [('ingreso', 9000000, date(2025, 11, 1)), ('gasto', 1200000, date(2025, 11, 12)), ('ingreso', 500000, date(2026, 1, 15)), ('gasto', 999999, date(2025, 10, 31)), ('ingreso', 999999, date(2026, 1, 16))]:
            Movimiento.objects.create(tipo=tipo, monto=monto, fecha=fecha, descripcion='Movimiento de prueba')
        data = self.client.get('/api/finanzas/dashboard/?meses=3').data
        self.assertEqual(data['desde'], '2025-11-01')
        self.assertEqual(data['hasta'], '2026-01-15')
        self.assertEqual(data['ingresos'], 9500000)
        self.assertEqual(data['gastos'], 1200000)
        self.assertEqual(data['saldo'], 8300000)
        self.assertEqual(data['cantidad_movimientos'], 3)
        self.assertEqual(data['serie'][1], {'mes': '2025-12-01', 'ingresos': 0, 'gastos': 0})
        self.assertEqual(len(data['ultimos_movimientos']), 3)
        self.assertEqual(data['ultimos_movimientos'][0]['fecha'], '2026-01-15')

    def test_registrar_movimiento_actualiza_resumen(self):
        response = self.client.post('/api/finanzas/movimientos/', {'tipo': 'gasto', 'monto': '250000', 'fecha': '2026-01-15', 'descripcion': 'Reparación'})
        self.assertEqual(response.status_code, 201)
        data = self.client.get('/api/finanzas/dashboard/').data
        self.assertEqual(data['gastos'], 250000)
        self.assertEqual(data['saldo'], -250000)
        self.assertEqual(data['ultimos_movimientos'][0]['descripcion'], 'Reparación')

    def test_rechaza_montos_invalidos_fechas_futuras_y_descripciones_vacias(self):
        base = {'tipo': 'ingreso', 'monto': '1000', 'fecha': '2026-01-15', 'descripcion': 'Venta'}
        for cambios in [{'monto': '0'}, {'monto': '-1'}, {'monto': '1.5'}, {'fecha': '2026-01-16'}, {'descripcion': '   '}, {'tipo': 'otro'}]:
            self.assertEqual(self.client.post('/api/finanzas/movimientos/', {**base, **cambios}).status_code, 400)
        self.assertEqual(Movimiento.objects.count(), 0)

    def test_permisos_de_dueno_y_periodos_permitidos(self):
        self.assertEqual(self.client.get('/api/finanzas/dashboard/?meses=24').status_code, 400)
        self.assertEqual(len(self.client.get('/api/finanzas/dashboard/?meses=12').data['serie']), 12)
        self.client.force_authenticate(get_user_model().objects.create_user(username='otro'))
        self.assertEqual(self.client.get('/api/finanzas/dashboard/').status_code, 403)
        self.assertEqual(self.client.post('/api/finanzas/movimientos/', {}).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/finanzas/dashboard/').status_code, 401)

    def test_resumen_vacio_y_limite_de_ultimos_movimientos(self):
        data = self.client.get('/api/finanzas/dashboard/').data
        self.assertEqual(data['stock'], 0)
        self.assertEqual(data['inversion_stock'], 0)
        self.assertEqual(len(data['serie']), 6)
        for indice in range(7):
            Movimiento.objects.create(tipo='ingreso', monto=100, fecha=date(2026, 1, 1), descripcion=str(indice))
        data = self.client.get('/api/finanzas/dashboard/').data
        self.assertEqual(len(data['ultimos_movimientos']), 5)
        self.assertEqual(data['ingresos'], 700)

    def test_marcar_vendido_actualiza_ingresos_stock_y_grafico_sin_duplicados(self):
        vehiculo = self.vehiculo('AAAA11', 'disponible', 5000000)
        url = f'/api/vehiculos/{vehiculo.pk}/'
        self.assertEqual(self.client.patch(url, {'estado': 'vendido'}).status_code, 200)
        data = self.client.get('/api/finanzas/dashboard/').data
        self.assertEqual(data['ingresos'], 9000000)
        self.assertEqual(data['serie'][-1]['ingresos'], 9000000)
        self.assertEqual(data['inventario']['vendido'], 1)
        self.assertEqual(data['stock'], 0)
        self.client.patch(url, {'estado': 'vendido', 'color': 'Rojo'})
        self.assertEqual(Movimiento.objects.count(), 1)
        self.client.patch(url, {'precio_venta': 10000000})
        self.assertEqual(Movimiento.objects.get().monto, 10000000)
        self.assertEqual(Movimiento.objects.get().fecha, date(2026, 1, 15))

    def test_revertir_venta_y_vender_nuevamente_reutiliza_movimiento(self):
        vehiculo = self.vehiculo('AAAA11', 'vendido', 5000000)
        url = f'/api/vehiculos/{vehiculo.pk}/'
        self.client.patch(url, {'estado': 'reservado'})
        self.assertEqual(self.client.get('/api/finanzas/dashboard/').data['ingresos'], 0)
        self.client.patch(url, {'estado': 'vendido'})
        self.assertEqual(self.client.get('/api/finanzas/dashboard/').data['ingresos'], 9000000)
        self.assertEqual(Movimiento.objects.count(), 1)

    def test_eliminar_ingreso_automatico_no_lo_recrea_al_editar(self):
        vehiculo = self.vehiculo('AAAA11', 'vendido', 5000000)
        movimiento = Movimiento.objects.get()
        url = f'/api/finanzas/movimientos/{movimiento.pk}/'
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.client.patch(f'/api/vehiculos/{vehiculo.pk}/', {'color': 'Negro', 'precio_venta': 9500000})
        data = self.client.get('/api/finanzas/dashboard/').data
        self.assertEqual(data['ingresos'], 0)
        self.assertEqual(data['inventario']['vendido'], 1)
        self.assertEqual(data['cantidad_movimientos'], 0)
        self.assertEqual(data['ultimos_movimientos'], [])
        self.assertTrue(Movimiento.objects.get().eliminado)

    def test_eliminar_gasto_recalcula_saldo_y_permisos(self):
        movimiento = Movimiento.objects.create(tipo='gasto', monto=100000, fecha=date(2026, 1, 15), descripcion='Taller')
        url = f'/api/finanzas/movimientos/{movimiento.pk}/'
        self.client.force_authenticate(get_user_model().objects.create_user(username='sinpermiso'))
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(url).status_code, 204)
        data = self.client.get('/api/finanzas/dashboard/').data
        self.assertEqual(data['gastos'], 0)
        self.assertEqual(data['saldo'], 0)

    def test_paginacion_permita_gestionar_movimientos_anteriores(self):
        for indice in range(8):
            Movimiento.objects.create(tipo='ingreso', monto=100, fecha=date(2026, 1, 1), descripcion=str(indice))
        data = self.client.get('/api/finanzas/dashboard/?pagina=2').data
        self.assertEqual(data['pagina'], 2)
        self.assertEqual(data['paginas'], 2)
        self.assertEqual(len(data['ultimos_movimientos']), 3)
        self.assertEqual(data['ingresos'], 800)
        self.assertEqual(self.client.get('/api/finanzas/dashboard/?pagina=-1').status_code, 400)

    def test_vendido_antiguo_no_inventa_fecha_y_venta_sin_precio_es_rechazada(self):
        vehiculo = self.vehiculo('AAAA11', 'disponible', 5000000)
        url = f'/api/vehiculos/{vehiculo.pk}/'
        self.assertEqual(self.client.patch(url, {'estado': 'vendido', 'precio_venta': 0}).status_code, 400)
        vehiculo.refresh_from_db()
        self.assertEqual(vehiculo.estado, 'disponible')
        Vehiculo.objects.filter(pk=vehiculo.pk).update(estado='vendido')
        self.client.patch(url, {'color': 'Azul'})
        self.assertEqual(Movimiento.objects.count(), 0)
