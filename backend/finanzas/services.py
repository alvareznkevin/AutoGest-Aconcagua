from zoneinfo import ZoneInfo
from decimal import Decimal
from django.utils import timezone
from .models import Movimiento


def sincronizar_venta(vehiculo, estado_anterior):
    """Se ejecuta dentro de la transacción de guardado del vehículo."""
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
