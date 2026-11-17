from datetime import date
from zoneinfo import ZoneInfo
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from .models import Movimiento, Venta
from .serializers import MovimientoSerializer, RegistrarVentaSerializer, VentaSerializer
from .services import gastos_vehiculo, ventas_con_gastos
from django.db import IntegrityError


class MovimientoCreateView(generics.CreateAPIView):
    queryset = Movimiento.objects.all()
    serializer_class = MovimientoSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        with transaction.atomic():
            vehiculo = serializer.validated_data.get('vehiculo')
            if vehiculo:
                Vehiculo.objects.select_for_update().get(pk=vehiculo.pk)
            serializer.save()


class MovimientoDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        with transaction.atomic():
            previo = get_object_or_404(Movimiento, pk=pk, eliminado=False)
            if previo.vehiculo_id:
                Vehiculo.objects.select_for_update().get(pk=previo.vehiculo_id)
            movimiento = get_object_or_404(Movimiento.objects.select_for_update(), pk=pk, eliminado=False)
            if Venta.objects.filter(movimiento=movimiento).exists():
                return Response({'detail': 'Este ingreso pertenece a una venta registrada y no puede eliminarse desde movimientos.'}, status=409)
            movimiento.eliminado = True
            movimiento.save(update_fields=['eliminado'])
        return Response(status=204)


class DashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        meses_texto = request.query_params.get('meses', '6')
        if meses_texto not in ['3', '6', '12']:
            return Response({'detail': 'Selecciona un período de 3, 6 o 12 meses.'}, status=400)
        meses = int(meses_texto)
        pagina_texto = request.query_params.get('pagina', '1')
        if not pagina_texto.isdigit() or len(pagina_texto) > 8 or int(pagina_texto) < 1:
            return Response({'detail': 'Página inválida.'}, status=400)
        hoy = timezone.localdate(timezone=ZoneInfo('America/Santiago'))
        indice = hoy.year * 12 + hoy.month - 1
        fechas = [date((indice - offset) // 12, (indice - offset) % 12 + 1, 1) for offset in reversed(range(meses))]
        movimientos = Movimiento.objects.filter(eliminado=False, fecha__gte=fechas[0], fecha__lte=hoy)
        cantidad = movimientos.count()
        paginas = max(1, (cantidad + 4) // 5)
        pagina = min(int(pagina_texto), paginas)
        agrupados = movimientos.annotate(mes=TruncMonth('fecha')).values('mes', 'tipo').annotate(total=Sum('monto'))
        valores = {(fila['mes'].year, fila['mes'].month, fila['tipo']): int(fila['total']) for fila in agrupados}
        serie = [{'mes': fecha.isoformat(), 'ingresos': valores.get((fecha.year, fecha.month, 'ingreso'), 0), 'gastos': valores.get((fecha.year, fecha.month, 'gasto'), 0)} for fecha in fechas]
        ingresos = sum(fila['ingresos'] for fila in serie)
        gastos = sum(fila['gastos'] for fila in serie)
        estados = dict(Vehiculo.objects.values('estado').annotate(cantidad=Count('id')).values_list('estado', 'cantidad'))
        inventario = {estado: estados.get(estado, 0) for estado in ['disponible', 'reservado', 'vendido']}
        inversion = Vehiculo.objects.filter(estado__in=['disponible', 'reservado']).aggregate(total=Sum('precio_compra'))['total'] or 0
        ventas = ventas_con_gastos().filter(fecha__gte=fechas[0], fecha__lte=hoy)
        totales = ventas.aggregate(ingresos_ventas=Sum('precio_venta'), costo_compra=Sum('precio_compra'), gastos_ventas=Sum('gastos_asociados'))
        ingresos_ventas = int(totales['ingresos_ventas'] or 0)
        costo_compra = int(totales['costo_compra'] or 0)
        gastos_ventas = int(totales['gastos_ventas'] or 0)

        ventas_mensuales = ventas.annotate(mes=TruncMonth('fecha')).values('mes').annotate(
            cantidad=Count('id'), ingresos_mes=Sum('precio_venta'), compra_mes=Sum('precio_compra'), gastos_mes=Sum('gastos_asociados'),
        ).order_by('mes')
        por_mes = {(fila['mes'].year, fila['mes'].month): fila for fila in ventas_mensuales}
        serie_ventas = []
        for fecha in fechas:
            fila = por_mes.get((fecha.year, fecha.month), {})
            serie_ventas.append({'mes': fecha.isoformat(), 'ventas': fila.get('cantidad', 0),
                                 'margen': int(fila.get('ingresos_mes') or 0) - int(fila.get('compra_mes') or 0) - int(fila.get('gastos_mes') or 0)})

        # Reconocimiento por venta: el costo del auto y sus gastos vinculados
        # se restan en el mes de la venta, no nuevamente como egresos de caja.
        otros_por_mes = movimientos.filter(tipo='ingreso', automatico=False).annotate(mes=TruncMonth('fecha')).values('mes').annotate(total=Sum('monto'), cantidad=Count('id'))
        generales_por_mes = movimientos.filter(tipo='gasto', vehiculo__isnull=True).annotate(mes=TruncMonth('fecha')).values('mes').annotate(total=Sum('monto'), cantidad=Count('id'))
        otros_mapa = {(f['mes'].year, f['mes'].month): f for f in otros_por_mes}
        generales_mapa = {(f['mes'].year, f['mes'].month): f for f in generales_por_mes}
        serie_resultado = []
        for mes in serie_ventas:
            fecha_mes = date.fromisoformat(mes['mes'])
            clave = (fecha_mes.year, fecha_mes.month)
            otros = otros_mapa.get(clave, {})
            generales = generales_mapa.get(clave, {})
            ingreso_extra = int(otros.get('total') or 0)
            gasto_general = int(generales.get('total') or 0)
            serie_resultado.append({**mes, 'otros_ingresos': ingreso_extra, 'gastos_generales': gasto_general,
                                    'movimientos': otros.get('cantidad', 0) + generales.get('cantidad', 0),
                                    'resultado': mes['margen'] + ingreso_extra - gasto_general})
        otros_ingresos = sum(m['otros_ingresos'] for m in serie_resultado)
        gastos_generales = sum(m['gastos_generales'] for m in serie_resultado)
        gastos_stock = Movimiento.objects.filter(tipo='gasto', eliminado=False, vehiculo__estado__in=['disponible', 'reservado'], vehiculo__venta__isnull=True).aggregate(total=Sum('monto'))['total'] or 0
        resultado_periodo = {
            'total': ingresos_ventas + otros_ingresos - costo_compra - gastos_ventas - gastos_generales,
            'ingresos_ventas': ingresos_ventas, 'otros_ingresos': otros_ingresos,
            'costo_compra': costo_compra, 'gastos_vehiculos_vendidos': gastos_ventas,
            'gastos_generales': gastos_generales, 'gastos_stock_pendientes': int(gastos_stock),
            'serie': serie_resultado,
        }

        return Response({
            'resultado_periodo': resultado_periodo,
            'ventas': {'serie': serie_ventas, 'cantidad': ventas.count(), 'ingresos': ingresos_ventas, 'costo_compra': costo_compra, 'gastos': gastos_ventas, 'ganancia': ingresos_ventas - costo_compra - gastos_ventas,
                       'ultimas': VentaSerializer(ventas.select_related('vehiculo', 'cliente')[:5], many=True).data,
                       'vendidos_sin_registro': Vehiculo.objects.filter(estado='vendido', venta__isnull=True).count()},
            'desde': fechas[0].isoformat(), 'hasta': hoy.isoformat(), 'actualizado': timezone.now().isoformat(),
            'ingresos': ingresos, 'gastos': gastos, 'saldo': ingresos - gastos,
            'inventario': inventario, 'stock': inventario['disponible'] + inventario['reservado'],
            'inversion_stock': int(inversion), 'clientes': Cliente.objects.count(),
            'serie': serie, 'cantidad_movimientos': cantidad, 'pagina': pagina, 'paginas': paginas,
            'ultimos_movimientos': MovimientoSerializer(movimientos.select_related('vehiculo')[(pagina-1)*5:pagina*5], many=True).data,
        })


class VentaVehiculoView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        vehiculo = get_object_or_404(Vehiculo, pk=pk)
        venta = ventas_con_gastos().filter(vehiculo=vehiculo).select_related('vehiculo', 'cliente').first()
        gastos = gastos_vehiculo(pk)
        return Response({'vehiculo': {'id': pk, 'patente': vehiculo.patente, 'marca': vehiculo.marca, 'modelo': vehiculo.modelo, 'estado': vehiculo.estado},
                         'precio_compra': int(vehiculo.precio_compra), 'precio_sugerido': int(vehiculo.precio_venta),
                         'gastos': int(gastos), 'gastos_detalle': list(Movimiento.objects.filter(vehiculo_id=pk, tipo='gasto', eliminado=False).values('id', 'descripcion', 'fecha', 'monto')),
                         'venta': VentaSerializer(venta).data if venta else None})

    def post(self, request, pk):
        datos = RegistrarVentaSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        d = datos.validated_data
        try:
            with transaction.atomic():
                v = get_object_or_404(Vehiculo.objects.select_for_update(), pk=pk)
                if Venta.objects.filter(vehiculo=v).exists() or v.estado == 'vendido':
                    return Response({'detail': 'El vehículo ya está vendido. No se registró otra venta.'}, status=409)
                gastos = gastos_vehiculo(pk)
                if gastos != d['gastos_confirmados'] or v.precio_compra != d['precio_compra_confirmado']:
                    return Response({'detail': 'Los costos cambiaron desde que abriste el formulario. Actualiza el resumen antes de confirmar.'}, status=409)
                ganancia = d['precio_venta'] - v.precio_compra - gastos
                if ganancia < 0 and not d['confirmar_perdida']:
                    return Response({'detail': 'Esta venta produce una pérdida. Marca la confirmación de pérdida para continuar.'}, status=400)
                v.estado = 'vendido'
                v.precio_venta = d['precio_venta']
                v.save(update_fields=['estado', 'precio_venta'])
                movimiento = Movimiento.objects.select_for_update().get(vehiculo=v, automatico=True)
                movimiento.fecha = d['fecha']
                movimiento.monto = d['precio_venta']
                movimiento.eliminado = False
                movimiento.save(update_fields=['fecha', 'monto', 'eliminado'])
                venta = Venta.objects.create(vehiculo=v, cliente=d['cliente'], movimiento=movimiento, fecha=d['fecha'], precio_venta=d['precio_venta'], precio_compra=v.precio_compra)
                return Response(VentaSerializer(venta).data, status=201)
        except IntegrityError:
            return Response({'detail': 'No fue posible registrar la venta: el vehículo o el comprador cambió. Actualiza y vuelve a intentar.'}, status=409)
