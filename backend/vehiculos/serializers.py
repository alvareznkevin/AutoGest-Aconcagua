from rest_framework import serializers
from .models import Vehiculo


class VehiculoSerializer(serializers.ModelSerializer):
    

    class Meta:
        model = Vehiculo
        fields = ['id','patente', 'marca', 'modelo', 'anio', 'tipo', 'color',
                  'kilometraje', 'combustible','transmision', 'precio_compra',
                  'precio_venta','estado', 'descripcion','imagen']
        read_only_fields = ['id']