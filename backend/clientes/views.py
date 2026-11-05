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
