from django.urls import path

from .views import RegistrarClienteView, DetalleClienteView

urlpatterns = [
    path('', RegistrarClienteView.as_view(), name='registar-cliente'),
    path('<int:pk>/', DetalleClienteView.as_view(), name='detalle-cliente'),

]
