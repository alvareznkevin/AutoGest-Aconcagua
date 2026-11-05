from zoneinfo import ZoneInfo
from django.utils import timezone
from rest_framework import serializers
from .models import Movimiento


class MovimientoSerializer(serializers.ModelSerializer):
    fecha = serializers.DateField(required=True)
    patente = serializers.CharField(source='vehiculo.patente', read_only=True, default=None)

    def validate_fecha(self, valor):
        if valor > timezone.localdate(timezone=ZoneInfo('America/Santiago')):
            raise serializers.ValidationError('Registra movimientos realizados hasta hoy.')
        return valor

    class Meta:
        model = Movimiento
        fields = ['id', 'tipo', 'monto', 'fecha', 'descripcion', 'vehiculo', 'patente', 'automatico']
        read_only_fields = ['id', 'patente', 'automatico']
