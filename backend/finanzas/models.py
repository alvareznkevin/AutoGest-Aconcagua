from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone

class Movimiento(models.Model):
    automatico = models.BooleanField(default=False, editable=False)
    eliminado = models.BooleanField(default=False, editable=False)
    tipo = models.CharField(max_length=10, choices=[('ingreso', 'Ingreso'), ('gasto', 'Gasto')])
    monto = models.DecimalField(max_digits=12, decimal_places=0, validators=[MinValueValidator(1)])
    fecha = models.DateField(default=timezone.localdate)
    descripcion = models.CharField(max_length=200)
    vehiculo = models.ForeignKey('vehiculos.Vehiculo', null=True, blank=True, on_delete=models.PROTECT, related_name='movimientos')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha', '-id']
        constraints = [
            models.CheckConstraint(condition=models.Q(monto__gt=0), name='movimiento_monto_positivo'),
            models.UniqueConstraint(fields=['vehiculo'], condition=models.Q(automatico=True), name='un_ingreso_automatico_por_vehiculo'),
        ]

    def __str__(self):
        return f'{self.fecha} · {self.tipo} · {self.descripcion}'
