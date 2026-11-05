from django.db.models.deletion import ProtectedError
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Vehiculo
from .serializers import VehiculoSerializer
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
import mimetypes
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from .patentes import consultar_patente, consultar_tasacion, consultar_recalls, ErrorPatente
from django.utils import timezone


class ConsultaPatenteThrottle(UserRateThrottle):
    rate = '10/min'
    scope = 'consulta_patente'


class ConsultaPatenteView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ConsultaPatenteThrottle]

    def get(self, request):
        try:
            return Response(consultar_patente(request.query_params.get('patente', '')))
        except ErrorPatente as error:
            return Response({'detail': error.mensaje}, status=error.status)


class ConsultaVehiculoView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ConsultaPatenteThrottle]

    def post(self, request, pk, consulta):
        vehiculo = get_object_or_404(Vehiculo, pk=pk)
        try:
            if consulta == 'tasacion':
                vehiculo.tasacion = consultar_tasacion(vehiculo.patente)
                vehiculo.save(update_fields=['tasacion'])
            elif consulta == 'recalls':
                vehiculo.recalls = consultar_recalls(vehiculo.vin)
                vehiculo.save(update_fields=['recalls'])
            elif consulta == 'ficha':
                datos = consultar_patente(vehiculo.patente)['datos']
                campos = ['vin', 'numero_motor', 'version', 'cilindrada', 'puertas']
                if not any(campo in datos for campo in campos):
                    raise ErrorPatente('No hay datos técnicos adicionales disponibles para esta patente.', 404)
                if datos.get('vin') and datos['vin'] != vehiculo.vin:
                    vehiculo.recalls = None
                for campo in campos:
                    if campo in datos:
                        setattr(vehiculo, campo, datos[campo])
                vehiculo.ficha_consultada = timezone.now()
                vehiculo.save(update_fields=campos + ['ficha_consultada', 'recalls'])
            else:
                return Response({'detail': 'Consulta no disponible.'}, status=404)
        except ErrorPatente as error:
            return Response({'detail': error.mensaje}, status=error.status)
        return Response(VehiculoSerializer(vehiculo, context={'request': request}).data)


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


class VehiculoDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        vehiculo = self.get_object()
        try:
            vehiculo.delete()
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar este vehículo porque tiene movimientos financieros asociados.'},
                status=409,
            )
        return Response(status=204)
