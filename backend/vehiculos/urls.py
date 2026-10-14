from django.urls import path
from .views import VehiculoListCreateView

urlpatterns = [
    path('', VehiculoListCreateView.as_view(), name='vehiculos'),
]