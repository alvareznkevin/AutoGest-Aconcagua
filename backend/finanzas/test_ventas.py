from datetime import timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase
from finanzas.models import Venta, Movimiento
from clientes.models import Cliente
from vehiculos.models import Vehiculo


class RegistroVentaTests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(username='admin',is_staff=True)
        self.client.force_authenticate(self.admin)
        self.comprador = Cliente.objects.create(nombre='Ana',correo='ana@example.com',telefono='123',preferencia='Automóvil')
        self.v = Vehiculo.objects.create(patente='ABCD12',marca='Marca',modelo='Modelo',anio=2020,tipo='automovil',color='Azul',kilometraje=1000,combustible='bencina',transmision='manual',precio_compra=8000000,precio_venta=11000000)
        self.hoy = timezone.localdate(timezone=ZoneInfo('America/Santiago'))
        self.url = f'/api/finanzas/vehiculos/{self.v.pk}/venta/'
        self.datos = {'cliente':self.comprador.pk,'fecha':str(self.hoy),'precio_venta':10000000,'precio_compra_confirmado':8000000,'gastos_confirmados':500000}
        self.gasto = Movimiento.objects.create(vehiculo=self.v,tipo='gasto',monto=500000,fecha=self.hoy,descripcion='Reparación')

    def vender(self):
        response = self.client.post(self.url,self.datos,format='json')
        self.assertEqual(response.status_code,201,response.data)
        return response

    def test_venta_atomicamente_marca_vendido_genera_un_ingreso_y_ganancia(self):
        response = self.vender()
        self.assertEqual(response.data['ganancia'],1500000)
        self.v.refresh_from_db()
        self.assertEqual(self.v.estado,'vendido')
        self.assertEqual(self.v.precio_venta,10000000)
        ingreso=Movimiento.objects.get(automatico=True,vehiculo=self.v)
        self.assertEqual(ingreso.monto,10000000)
        self.assertEqual(ingreso.fecha,self.hoy)
        self.assertEqual(Venta.objects.get().precio_compra,8000000)
        dashboard=self.client.get('/api/finanzas/dashboard/').data
        self.assertEqual(dashboard['ventas']['cantidad'],1)
        self.assertEqual(dashboard['ventas']['ganancia'],1500000)
        self.assertEqual(dashboard['ingresos'],10000000)
        self.assertEqual(dashboard['stock'],0)
        self.assertEqual(self.client.post(self.url,self.datos,format='json').status_code,409)
        self.assertEqual(Venta.objects.count(),1)
        self.assertEqual(Movimiento.objects.filter(automatico=True).count(),1)

    def test_fecha_real_y_periodo_de_venta(self):
        self.datos['fecha']='2020-01-01'
        self.vender()
        self.assertEqual(Movimiento.objects.get(automatico=True).fecha.isoformat(),'2020-01-01')
        dashboard=self.client.get('/api/finanzas/dashboard/').data
        self.assertEqual(dashboard['ventas']['cantidad'],0)
        self.assertEqual(dashboard['ventas']['ganancia'],0)
        self.assertEqual(dashboard['ingresos'],0)
        self.assertEqual(dashboard['inventario']['vendido'],1)

    def test_costos_modificados_rechaza_sin_vender(self):
        self.datos['gastos_confirmados']=0
        self.assertEqual(self.client.post(self.url,self.datos,format='json').status_code,409)
        self.v.refresh_from_db();self.assertEqual(self.v.estado,'disponible')
        self.assertFalse(Venta.objects.exists())
        self.assertFalse(Movimiento.objects.filter(automatico=True).exists())

    def test_perdida_requiere_confirmacion(self):
        self.datos['precio_venta']=7000000
        self.assertEqual(self.client.post(self.url,self.datos,format='json').status_code,400)
        self.assertFalse(Venta.objects.exists())
        self.datos['confirmar_perdida']=True
        self.assertEqual(self.vender().data['ganancia'],-1500000)

    def test_fecha_futura_y_precio_invalido(self):
        self.datos['fecha']=str(self.hoy+timedelta(days=1))
        self.assertEqual(self.client.post(self.url,self.datos,format='json').status_code,400)
        self.datos['fecha']=str(self.hoy);self.datos['precio_venta']=0
        self.assertEqual(self.client.post(self.url,self.datos,format='json').status_code,400)
        self.assertFalse(Venta.objects.exists())

    def test_protege_venta_y_comprador(self):
        self.vender()
        ingreso=Movimiento.objects.get(automatico=True)
        self.assertEqual(self.client.delete(f'/api/finanzas/movimientos/{ingreso.pk}/').status_code,409)
        self.assertEqual(self.client.delete(f'/api/clientes/{self.comprador.pk}/').status_code,409)
        self.assertEqual(self.client.delete(f'/api/vehiculos/{self.v.pk}/').status_code,409)
        self.assertEqual(self.client.patch(f'/api/vehiculos/{self.v.pk}/',{'estado':'disponible'}).status_code,400)
        self.assertEqual(self.client.patch(f'/api/vehiculos/{self.v.pk}/',{'precio_venta':1}).status_code,400)
        self.assertEqual(self.client.patch(f'/api/vehiculos/{self.v.pk}/',{'color':'Negro'}).status_code,200)
        ingreso.refresh_from_db();self.assertEqual(ingreso.monto,10000000)

    def test_gastos_posteriores_y_exclusiones_recalculan_sin_duplicar(self):
        self.vender()
        self.client.post('/api/finanzas/movimientos/',{'tipo':'gasto','monto':100000,'fecha':str(self.hoy),'descripcion':'Transferencia','vehiculo':self.v.pk})
        # Gasto general no se resta de la ganancia individual.
        self.client.post('/api/finanzas/movimientos/',{'tipo':'gasto','monto':999999,'fecha':str(self.hoy),'descripcion':'Arriendo'})
        self.assertEqual(self.client.get('/api/finanzas/dashboard/').data['ventas']['ganancia'],1400000)
        self.client.delete(f'/api/finanzas/movimientos/{self.gasto.pk}/')
        self.assertEqual(self.client.get('/api/finanzas/dashboard/').data['ventas']['ganancia'],1900000)
        self.assertEqual(Movimiento.objects.filter(automatico=True).count(),1)

    def test_resumen_muestra_gastos_y_solo_administrador_puede_vender(self):
        response=self.client.get(self.url)
        self.assertEqual(response.data['gastos'],500000)
        self.assertEqual(len(response.data['gastos_detalle']),1)
        self.client.force_authenticate(get_user_model().objects.create_user(username='operador'))
        self.assertEqual(self.client.post(self.url,self.datos,format='json').status_code,403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.url,self.datos,format='json').status_code,401)

    def test_no_inventa_ventas_historicas(self):
        Vehiculo.objects.filter(pk=self.v.pk).update(estado='vendido')
        self.assertEqual(self.client.post(self.url,self.datos,format='json').status_code,409)
        resumen=self.client.get('/api/finanzas/dashboard/').data['ventas']
        self.assertEqual(resumen['cantidad'],0)
        self.assertEqual(resumen['vendidos_sin_registro'],1)

    def test_fallo_en_creacion_revierte_vehiculo_e_ingreso(self):
        from unittest.mock import patch
        from django.db import IntegrityError
        with patch('finanzas.views.Venta.objects.create',side_effect=IntegrityError('conflicto')):
            self.assertEqual(self.client.post(self.url,self.datos,format='json').status_code,409)
        self.v.refresh_from_db()
        self.assertEqual(self.v.estado,'disponible')
        self.assertEqual(self.v.precio_venta,11000000)
        self.assertFalse(Movimiento.objects.filter(automatico=True).exists())
        self.assertFalse(Venta.objects.exists())

    def test_series_mensuales_margen_y_cantidad_sin_duplicar_gastos(self):
        self.vender()
        anterior = self.hoy.replace(day=1) - timedelta(days=1)
        otro = Vehiculo.objects.create(patente='EFGH34',marca='Otra',modelo='Modelo',anio=2019,tipo='automovil',color='Blanco',kilometraje=2000,combustible='bencina',transmision='manual',precio_compra=8000000,precio_venta=7000000)
        datos = {**self.datos,'fecha':str(anterior),'precio_venta':7000000,'gastos_confirmados':0,'confirmar_perdida':True}
        self.assertEqual(self.client.post(f'/api/finanzas/vehiculos/{otro.pk}/venta/',datos,format='json').status_code,201)
        Movimiento.objects.create(tipo='gasto',monto=900000,descripcion='Gasto general',fecha=self.hoy)
        ventas = self.client.get('/api/finanzas/dashboard/').data['ventas']
        self.assertEqual(len(ventas['serie']),6)
        meses = {fila['mes']:fila for fila in ventas['serie']}
        actual = meses[self.hoy.replace(day=1).isoformat()]
        previo = meses[anterior.replace(day=1).isoformat()]
        self.assertEqual(actual['ventas'],1)
        self.assertEqual(actual['margen'],1500000)
        self.assertEqual(previo['ventas'],1)
        self.assertEqual(previo['margen'],-1000000)
        self.assertEqual(sum(f['ventas'] for f in ventas['serie']),ventas['cantidad'])
        self.assertEqual(sum(f['margen'] for f in ventas['serie']),ventas['ganancia'])
        self.assertEqual(ventas['ganancia'],500000)
        for fila in ventas['serie']:
            if fila['mes'] not in [actual['mes'],previo['mes']]:
                self.assertEqual((fila['ventas'],fila['margen']),(0,0))

    def test_resultado_del_periodo_descuenta_general_y_compra(self):
        self.gasto.eliminado=True;self.gasto.save()
        self.v.precio_compra=300000;self.v.save()
        self.datos.update(precio_venta=3000000,precio_compra_confirmado=300000,gastos_confirmados=0)
        Movimiento.objects.create(tipo='gasto',monto=300000,descripcion='Gasto general',fecha=self.hoy)
        self.vender()
        data=self.client.get('/api/finanzas/dashboard/').data
        self.assertEqual(data['ventas']['ganancia'],2700000)
        resultado=data['resultado_periodo']
        self.assertEqual(resultado['total'],2400000)
        self.assertEqual(resultado['costo_compra'],300000)
        self.assertEqual(resultado['gastos_generales'],300000)
        self.assertEqual(resultado['otros_ingresos'],0)
        self.assertEqual(sum(m['resultado'] for m in resultado['serie']),resultado['total'])
        self.assertEqual(resultado['serie'][-1]['resultado'],2400000)

    def test_resultado_no_resta_dos_veces_gasto_vinculado_ni_duplica_venta(self):
        self.vender()
        Movimiento.objects.create(tipo='gasto',monto=300000,descripcion='Arriendo',fecha=self.hoy)
        Movimiento.objects.create(tipo='ingreso',monto=100000,descripcion='Otro ingreso',fecha=self.hoy)
        resultado=self.client.get('/api/finanzas/dashboard/').data['resultado_periodo']
        self.assertEqual(resultado['gastos_vehiculos_vendidos'],500000)
        self.assertEqual(resultado['gastos_generales'],300000)
        self.assertEqual(resultado['otros_ingresos'],100000)
        self.assertEqual(resultado['ingresos_ventas'],10000000)
        self.assertEqual(resultado['total'],1300000)

    def test_gastos_de_stock_diferidos_y_general_sin_ventas_es_negativo(self):
        Movimiento.objects.create(tipo='gasto',monto=300000,descripcion='Arriendo',fecha=self.hoy)
        data=self.client.get('/api/finanzas/dashboard/').data['resultado_periodo']
        self.assertEqual(data['total'],-300000)
        self.assertEqual(data['gastos_stock_pendientes'],500000)
        self.assertEqual(data['gastos_vehiculos_vendidos'],0)
        self.assertEqual(data['serie'][-1]['resultado'],-300000)
        self.assertEqual(data['serie'][-1]['ventas'],0)
        self.assertGreater(data['serie'][-1]['movimientos'],0)

    def test_general_por_fecha_y_gasto_vinculado_por_mes_de_venta(self):
        anterior=self.hoy.replace(day=1)-timedelta(days=1)
        self.datos['fecha']=str(anterior)
        self.vender()
        general=Movimiento.objects.create(tipo='gasto',monto=300000,descripcion='Arriendo',fecha=self.hoy)
        self.client.delete(f'/api/finanzas/movimientos/{self.gasto.pk}/')
        resultado=self.client.get('/api/finanzas/dashboard/').data['resultado_periodo']
        meses={m['mes']:m for m in resultado['serie']}
        self.assertEqual(meses[anterior.replace(day=1).isoformat()]['resultado'],2000000)
        self.assertEqual(meses[self.hoy.replace(day=1).isoformat()]['resultado'],-300000)
        self.assertEqual(resultado['total'],1700000)
        self.client.delete(f'/api/finanzas/movimientos/{general.pk}/')
        self.assertEqual(self.client.get('/api/finanzas/dashboard/').data['resultado_periodo']['total'],2000000)
