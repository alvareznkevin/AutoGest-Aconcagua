from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import IsAdminUser

from .models import Cliente
from .serializers import ClienteSerializer


class RegistrarClienteView(generics.ListCreateAPIView):
    queryset = Cliente.objects.order_by("-id")
    serializer_class = ClienteSerializer
    permission_classes = [IsAdminUser]

class DetalleClienteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAdminUser]


from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from .recomendaciones import CriteriosSerializer, ErrorRecomendacion, recomendar


class RecomendacionesThrottle(UserRateThrottle):
    rate = '5/min'
    scope = 'recomendaciones'


class RecomendacionesClienteView(APIView):
    permission_classes = [IsAdminUser]
    throttle_classes = [RecomendacionesThrottle]

    def post(self, request, pk):
        get_object_or_404(Cliente, pk=pk)
        criterios = CriteriosSerializer(data=request.data)
        criterios.is_valid(raise_exception=True)
        try:
            return Response(recomendar(criterios.validated_data))
        except ErrorRecomendacion as error:
            return Response({'detail': error.mensaje}, status=error.status)
