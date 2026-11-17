from zoneinfo import ZoneInfo
from django.utils import timezone
from rest_framework import serializers
from .models import Movimiento, Venta
from clientes.models import Cliente


class MovimientoSerializer(serializers.ModelSerializer):
    venta_registrada = serializers.SerializerMethodField()

    def get_venta_registrada(self, obj):
        return hasattr(obj, 'venta_registrada')

    fecha = serializers.DateField(required=True)
    patente = serializers.CharField(source='vehiculo.patente', read_only=True, default=None)

    def validate_fecha(self, valor):
        if valor > timezone.localdate(timezone=ZoneInfo('America/Santiago')):
            raise serializers.ValidationError('Registra movimientos realizados hasta hoy.')
        return valor

    class Meta:
        model = Movimiento
        fields = ['id', 'tipo', 'monto', 'fecha', 'descripcion', 'vehiculo', 'patente', 'automatico', 'venta_registrada']
        read_only_fields = ['id', 'patente', 'automatico']


class RegistrarVentaSerializer(serializers.Serializer):
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    fecha = serializers.DateField()
    precio_venta = serializers.DecimalField(max_digits=12, decimal_places=0, min_value=1)
    precio_compra_confirmado = serializers.DecimalField(max_digits=12, decimal_places=0, min_value=0)
    gastos_confirmados = serializers.DecimalField(max_digits=18, decimal_places=0, min_value=0)
    confirmar_perdida = serializers.BooleanField(default=False)

    def validate_fecha(self, valor):
        if valor > timezone.localdate(timezone=ZoneInfo('America/Santiago')):
            raise serializers.ValidationError('La fecha de venta no puede estar en el futuro.')
        return valor


class VentaSerializer(serializers.ModelSerializer):
    patente = serializers.CharField(source='vehiculo.patente', read_only=True)
    comprador = serializers.CharField(source='cliente.nombre', read_only=True)
    gastos = serializers.SerializerMethodField()
    ganancia = serializers.SerializerMethodField()

    def get_gastos(self, obj):
        from .services import gastos_vehiculo
        return int(obj.gastos_asociados if hasattr(obj, 'gastos_asociados') else gastos_vehiculo(obj.vehiculo_id))

    def get_ganancia(self, obj):
        return int(obj.precio_venta - obj.precio_compra) - self.get_gastos(obj)

    class Meta:
        model = Venta
        fields = ['id', 'vehiculo', 'patente', 'cliente', 'comprador', 'fecha', 'precio_venta', 'precio_compra', 'gastos', 'ganancia']
        read_only_fields = fields
