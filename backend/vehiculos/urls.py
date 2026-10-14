from django.urls import path
from .views import VehiculoListCreateView, VehiculoImagenView

urlpatterns = [
    path('', VehiculoListCreateView.as_view(), name='vehiculos'),
    path('<int:pk>/imagen/', VehiculoImagenView.as_view(), name='vehiculo-imagen'),
]
