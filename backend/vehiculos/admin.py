from django.contrib import admin
from .models import Vehiculo


@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = (
        'patente', 'marca', 'modelo', 'anio',
        'precio_venta', 'estado',
    )
    search_fields = ('patente', 'marca', 'modelo')
    list_filter = ('estado', 'marca', 'tipo')