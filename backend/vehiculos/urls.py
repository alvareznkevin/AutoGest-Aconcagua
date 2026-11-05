from django.urls import path
from .views import (
    VehiculoListCreateView,
    VehiculoDetailView,
    VehiculoImagenView,
    ConsultaPatenteView,
    ConsultaVehiculoView,
)

urlpatterns = [
    path('<int:pk>/consultas/<str:consulta>/', ConsultaVehiculoView.as_view(), name='vehiculo-consulta'),
    path('consultar-patente/', ConsultaPatenteView.as_view(), name='consultar-patente'),
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
