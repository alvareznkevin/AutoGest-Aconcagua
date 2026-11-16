from django.urls import path

from .views import RegistrarClienteView, DetalleClienteView, RecomendacionesClienteView

urlpatterns = [
    path('<int:pk>/recomendaciones/', RecomendacionesClienteView.as_view(), name='recomendaciones-cliente'),
    path('', RegistrarClienteView.as_view(), name='registar-cliente'),
    path('<int:pk>/', DetalleClienteView.as_view(), name='detalle-cliente'),

]
