from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Vehiculo
from .serializers import VehiculoSerializer


class VehiculoListCreateView(generics.ListCreateAPIView):
    queryset = Vehiculo.objects.all().order_by('-id')
    serializer_class = VehiculoSerializer
    permission_classes = [IsAuthenticated]