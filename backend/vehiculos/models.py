from django.db import models, transaction
from django.core.exceptions import ValidationError

# Create your models here.

class Vehiculo(models.Model):
    def clean(self):
        super().clean()
        if self.estado == 'vendido' and self.precio_venta is not None and self.precio_venta <= 0:
            raise ValidationError({'precio_venta': 'Para registrar una venta, el precio debe ser mayor que $0.'})

    def save(self, *args, **kwargs):
        from finanzas.services import sincronizar_venta
        with transaction.atomic():
            anterior = type(self).objects.select_for_update().filter(pk=self.pk).first() if self.pk else None
            super().save(*args, **kwargs)
            sincronizar_venta(self, anterior.estado if anterior else None)

    vin = models.CharField(max_length=50, blank=True)
    numero_motor = models.CharField(max_length=100, blank=True)
    version = models.CharField(max_length=150, blank=True)
    cilindrada = models.CharField(max_length=50, blank=True)
    puertas = models.PositiveSmallIntegerField(null=True, blank=True)
    tasacion = models.JSONField(null=True, blank=True)
    recalls = models.JSONField(null=True, blank=True)
    ficha_consultada = models.DateTimeField(null=True, blank=True)
    patente = models.CharField(
        max_length=10, unique=True
    )

    marca = models.CharField(
        max_length=50
    )

    modelo = models.CharField(
        max_length=100
    )

    anio = models.PositiveIntegerField(

    )

    tipo = models.CharField(
        max_length=20,
        choices=[
            ('automovil', 'Automóvil'),
            ('camioneta', 'Camioneta'),
            ('camion', 'Camión'),
        ],
    )

    color = models.CharField(
        max_length=50)

    kilometraje = models.PositiveIntegerField(

    )

    combustible = models.CharField(
        max_length=20,
        choices=[
            ('bencina', 'Bencina'),
            ('diesel', 'Diésel'),
            ('electrico', 'Eléctrico'),
            ('hibrido', 'Híbrido'),
        ],
    )

    transmision = models.CharField(
        max_length=20,
        choices=[
            ('manual', 'Manual'),
            ('automatica', 'Automática'),
        ],
    )
    precio_compra = models.DecimalField(
        max_digits=12,decimal_places=0)

    precio_venta = models.DecimalField(
            max_digits=12,decimal_places=0)

    estado = models.CharField(
        max_length=20,
        choices=[
            ('disponible', 'Disponible'),
            ('reservado', 'Reservado'),
            ('vendido', 'Vendido'),
        ],
        default='disponible',
    )

    descripcion = models.TextField(
        blank=True)


    imagen = models.ImageField(
    upload_to='vehiculos/',
    blank=True,
    null=True,
)

    def __str__(self):
        return f'{self.patente} - {self.marca} {self.modelo}'
