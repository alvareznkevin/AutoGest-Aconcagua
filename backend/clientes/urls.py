from django.urls import path

from .views import RegistrarClienteView

urlpatterns = [
    path('', RegistrarClienteView.as_view(), name='registar-cliente'),

]
