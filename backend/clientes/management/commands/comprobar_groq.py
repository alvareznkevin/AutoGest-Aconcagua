"""Comprueba el proveedor sin imprimir claves ni datos de clientes."""
import getpass
import os
import subprocess
import sys
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.test.utils import override_settings
from clientes.recomendaciones import consultar_ia, ErrorRecomendacion


class Command(BaseCommand):
    help = 'Prueba Groq con datos ficticios; puede pedir una clave oculta y arrancar Django con esa misma clave.'

    def add_arguments(self, parser):
        parser.add_argument('--nueva-clave', action='store_true', help='Solicita la clave sin mostrarla ni guardarla en archivos.')
        parser.add_argument('--iniciar', action='store_true', help='Arranca runserver después de una comprobación exitosa.')

    def handle(self, *args, **options):
        clave = settings.GROQ_API_KEY.strip()
        if options['nueva_clave']:
            clave = getpass.getpass('Pega tu clave de Groq (no se mostrará): ').strip()
        if not clave:
            raise CommandError('No hay clave en esta terminal. Usa --nueva-clave para introducirla de forma oculta.')
        if clave in ['TU_CLAVE_DE_GROQ', 'PEGA_TU_CLAVE_AQUI', 'PEGA_AQUI_LA_CLAVE_DE_GROQ'] or any(c.isspace() for c in clave) or clave.startswith(('Bearer ', '"', "'")):
            raise CommandError('La clave contiene un ejemplo, comillas o espacios. Copia únicamente el valor desde Groq Console.')
        self.stdout.write('Probando autenticación, modelo y respuesta JSON con datos ficticios…')
        try:
            with override_settings(GROQ_API_KEY=clave):
                consultar_ia({'criterios': {'preferencias': 'Prueba técnica. Devuelve inventario y externos vacíos.'}, 'candidatos': []})
        except ErrorRecomendacion as error:
            raise CommandError(error.mensaje) from None
        self.stdout.write(self.style.SUCCESS('Groq acepta la clave y el modelo; respuesta JSON válida.'))
        if options['iniciar']:
            entorno = os.environ.copy()
            entorno['GROQ_API_KEY'] = clave
            entorno['GROQ_MODEL'] = settings.GROQ_MODEL
            self.stdout.write('Iniciando Django en 127.0.0.1:8000 con la clave comprobada…')
            try:
                resultado = subprocess.run([sys.executable, str(Path(settings.BASE_DIR) / 'manage.py'), 'runserver', '127.0.0.1:8000'], env=entorno, check=False)
            except KeyboardInterrupt:
                return
            if resultado.returncode:
                raise CommandError('Django no pudo iniciarse. Revisa si otra terminal está usando el puerto 8000.')
