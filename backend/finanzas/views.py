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
from .models import Movimiento
from .serializers import MovimientoSerializer


class MovimientoCreateView(generics.CreateAPIView):
    queryset = Movimiento.objects.all()
    serializer_class = MovimientoSerializer
    permission_classes = [IsAdminUser]


class MovimientoDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        with transaction.atomic():
            movimiento = get_object_or_404(Movimiento.objects.select_for_update(), pk=pk, eliminado=False)
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
        return Response({
            'desde': fechas[0].isoformat(), 'hasta': hoy.isoformat(), 'actualizado': timezone.now().isoformat(),
            'ingresos': ingresos, 'gastos': gastos, 'saldo': ingresos - gastos,
            'inventario': inventario, 'stock': inventario['disponible'] + inventario['reservado'],
            'inversion_stock': int(inversion), 'clientes': Cliente.objects.count(),
            'serie': serie, 'cantidad_movimientos': cantidad, 'pagina': pagina, 'paginas': paginas,
            'ultimos_movimientos': MovimientoSerializer(movimientos.select_related('vehiculo')[(pagina-1)*5:pagina*5], many=True).data,
        })
