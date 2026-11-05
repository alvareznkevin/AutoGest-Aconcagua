from django.urls import path
from .views import DashboardView, MovimientoCreateView, MovimientoDeleteView

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard-resumen'),
    path('movimientos/', MovimientoCreateView.as_view(), name='movimiento-crear'),
    path('movimientos/<int:pk>/', MovimientoDeleteView.as_view(), name='movimiento-eliminar'),
]
