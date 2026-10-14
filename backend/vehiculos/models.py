from django.db import models

# Create your models here.

class Vehiculo(models.Model):
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
