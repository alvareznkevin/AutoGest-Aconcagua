from django.test import TestCase
from rest_framework.exceptions import ValidationError
from .serializers import VehiculoSerializer

class PreciosVehiculoTests(TestCase):
    def test_precios_desde_cero_sin_valores_negativos(self):
        serializer = VehiculoSerializer()
        for validar in [serializer.validate_precio_compra, serializer.validate_precio_venta]:
            for precio in [-1, -8000]:
                with self.assertRaises(ValidationError):
                    validar(precio)
            for precio in [0, 8000, 999999, 1000000]:
                self.assertEqual(validar(precio), precio)
            self.assertEqual(validar(9500000), 9500000)
