from django.contrib import admin
from .models import Movimiento

@admin.register(Movimiento)
class MovimientoAdmin(admin.ModelAdmin):
    list_display = ['fecha', 'tipo', 'descripcion', 'monto', 'vehiculo', 'automatico', 'eliminado']
    list_filter = ['tipo', 'fecha', 'automatico', 'eliminado']
    search_fields = ['descripcion', 'vehiculo__patente']
