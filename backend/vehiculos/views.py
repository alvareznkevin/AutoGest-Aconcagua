from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Vehiculo
from .serializers import VehiculoSerializer
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
import mimetypes


class VehiculoListCreateView(generics.ListCreateAPIView):
    queryset = Vehiculo.objects.all().order_by('-id')
    serializer_class = VehiculoSerializer
    permission_classes = [IsAuthenticated]


class VehiculoImagenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        vehiculo = get_object_or_404(Vehiculo, pk=pk)
        if not vehiculo.imagen:
            raise Http404('El vehículo no tiene fotografía')
        try:
            archivo = vehiculo.imagen.storage.open(vehiculo.imagen.name, 'rb')
        except FileNotFoundError:
            raise Http404('Fotografía no disponible')
        tipo = mimetypes.guess_type(vehiculo.imagen.name)[0]
        tipos_permitidos = {'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'}
        respuesta = FileResponse(archivo, content_type=tipo if tipo in tipos_permitidos else 'application/octet-stream')
        respuesta['Cache-Control'] = 'private, no-store'
        respuesta['X-Content-Type-Options'] = 'nosniff'
        return respuesta
