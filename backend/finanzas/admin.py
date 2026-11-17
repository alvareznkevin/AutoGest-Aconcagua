from django.contrib import admin
from .models import Movimiento

@admin.register(Movimiento)
class MovimientoAdmin(admin.ModelAdmin):
    list_display = ['fecha', 'tipo', 'descripcion', 'monto', 'vehiculo', 'automatico', 'eliminado']
    list_filter = ['tipo', 'fecha', 'automatico', 'eliminado']
    search_fields = ['descripcion', 'vehiculo__patente']

    def has_change_permission(self, request, obj=None):
        if obj and hasattr(obj, 'venta_registrada'):
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if obj and hasattr(obj, 'venta_registrada'):
            return False
        return super().has_delete_permission(request, obj)


from .models import Venta

@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ['fecha', 'vehiculo', 'cliente', 'precio_venta', 'precio_compra']
    search_fields = ['vehiculo__patente', 'cliente__nombre']
    readonly_fields = ['fecha', 'vehiculo', 'cliente', 'movimiento', 'precio_venta', 'precio_compra', 'creado']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
