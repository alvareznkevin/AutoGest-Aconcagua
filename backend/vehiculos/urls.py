from django.urls import path
from .views import (
    VehiculoListCreateView,
    VehiculoDetailView,
    VehiculoImagenView,
)

urlpatterns = [
    path(
        '',
        VehiculoListCreateView.as_view(),
        name='vehiculos',
    ),
    path(
        '<int:pk>/',
        VehiculoDetailView.as_view(),
        name='vehiculo-detalle',
    ),
    path(
        '<int:pk>/imagen/',
        VehiculoImagenView.as_view(),
        name='vehiculo-imagen',
    ),
]