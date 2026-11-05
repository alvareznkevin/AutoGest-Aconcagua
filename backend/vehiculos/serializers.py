from rest_framework import serializers
from .models import Vehiculo
from django.urls import reverse


class VehiculoSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        estado = attrs.get('estado', self.instance.estado if self.instance else 'disponible')
        precio = attrs.get('precio_venta', self.instance.precio_venta if self.instance else None)
        if estado == 'vendido' and precio is not None and precio <= 0:
            raise serializers.ValidationError({'precio_venta': 'Para registrar una venta, el precio debe ser mayor que $0.'})
        return attrs

    def validate_precio_compra(self, valor):
        if valor < 0:
            raise serializers.ValidationError('El precio de compra debe ser igual o mayor que $0.')
        return valor

    def validate_precio_venta(self, valor):
        if valor < 0:
            raise serializers.ValidationError('El precio de venta debe ser igual o mayor que $0.')
        return valor

    def update(self, instance, validated_data):
        if validated_data.get('patente', instance.patente) != instance.patente:
            instance.tasacion = None
            instance.recalls = None
            instance.ficha_consultada = None
        if validated_data.get('vin', instance.vin) != instance.vin:
            instance.recalls = None
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        datos = super().to_representation(instance)
        if instance.imagen:
            ruta = reverse('vehiculo-imagen', kwargs={'pk': instance.pk})
            request = self.context.get('request')
            datos['imagen'] = request.build_absolute_uri(ruta) if request else ruta
        return datos
    

    class Meta:
        model = Vehiculo
        fields = ['id','patente', 'marca', 'modelo', 'anio', 'tipo', 'color',
                  'kilometraje', 'combustible','transmision', 'precio_compra',
                  'precio_venta','estado', 'descripcion','imagen', 'vin', 'numero_motor',
                  'version', 'cilindrada', 'puertas', 'tasacion', 'recalls', 'ficha_consultada']
        read_only_fields = ['id', 'tasacion', 'recalls', 'ficha_consultada']
