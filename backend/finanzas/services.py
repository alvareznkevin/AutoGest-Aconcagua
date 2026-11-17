from zoneinfo import ZoneInfo
from decimal import Decimal
from django.utils import timezone
from .models import Movimiento, Venta


def sincronizar_venta(vehiculo, estado_anterior):
    """Se ejecuta dentro de la transacción de guardado del vehículo."""
    if Venta.objects.filter(vehiculo=vehiculo).exists():
        return
    movimientos = Movimiento.objects.filter(vehiculo=vehiculo, automatico=True)
    precio = Decimal(str(vehiculo.precio_venta))
    if vehiculo.estado != 'vendido' or precio <= 0:
        movimientos.update(eliminado=True)
        return
    movimiento = movimientos.select_for_update().first()
    nueva_venta = estado_anterior != 'vendido'
    if movimiento is None:
        # Una edición de un vendido antiguo no inventa una fecha de venta.
        if not nueva_venta:
            return
        movimiento = Movimiento(vehiculo=vehiculo, automatico=True)
    elif movimiento.eliminado and not nueva_venta:
        return
    if nueva_venta:
        movimiento.fecha = timezone.localdate(timezone=ZoneInfo('America/Santiago'))
    movimiento.tipo = 'ingreso'
    movimiento.monto = precio
    movimiento.descripcion = f'Venta de vehículo {vehiculo.patente}'
    movimiento.eliminado = False
    movimiento.save()


def gastos_vehiculo(vehiculo_id):
    from django.db.models import Sum
    return Movimiento.objects.filter(vehiculo_id=vehiculo_id, tipo='gasto', eliminado=False).aggregate(total=Sum('monto'))['total'] or Decimal('0')


def ventas_con_gastos():
    from django.db.models import OuterRef, Subquery, Sum, DecimalField, Value
    from django.db.models.functions import Coalesce
    gastos = Movimiento.objects.filter(vehiculo_id=OuterRef('vehiculo_id'), tipo='gasto', eliminado=False).values('vehiculo_id').annotate(total=Sum('monto')).values('total')
    return Venta.objects.annotate(gastos_asociados=Coalesce(Subquery(gastos, output_field=DecimalField(max_digits=18, decimal_places=0)), Value(Decimal('0'))))
