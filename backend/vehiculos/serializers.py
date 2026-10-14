from rest_framework import serializers
from .models import Vehiculo
from django.urls import reverse


class VehiculoSerializer(serializers.ModelSerializer):
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
                  'precio_venta','estado', 'descripcion','imagen']
        read_only_fields = ['id']
