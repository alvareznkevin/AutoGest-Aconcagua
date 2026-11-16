from io import StringIO
from unittest.mock import patch
from django.test import SimpleTestCase, override_settings
from django.core.management import call_command, CommandError
from clientes.recomendaciones import ErrorRecomendacion


@override_settings(GROQ_API_KEY='clave-ficticia', GROQ_MODEL='openai/gpt-oss-120b')
class ComprobarGroqTests(SimpleTestCase):
    @patch('clientes.management.commands.comprobar_groq.consultar_ia')
    def test_prueba_no_imprime_clave(self, consultar):
        salida = StringIO()
        call_command('comprobar_groq', stdout=salida)
        self.assertIn('respuesta JSON válida', salida.getvalue())
        self.assertNotIn('clave-ficticia', salida.getvalue())
        consultar.assert_called_once()

    @patch('clientes.management.commands.comprobar_groq.getpass.getpass', return_value='nueva-clave-ficticia')
    @patch('clientes.management.commands.comprobar_groq.consultar_ia')
    @patch('clientes.management.commands.comprobar_groq.subprocess.run')
    def test_arranque_hereda_clave_comprobada(self, ejecutar, consultar, entrada):
        ejecutar.return_value.returncode = 0
        salida = StringIO()
        call_command('comprobar_groq', nueva_clave=True, iniciar=True, stdout=salida)
        self.assertEqual(ejecutar.call_args.kwargs['env']['GROQ_API_KEY'], 'nueva-clave-ficticia')
        self.assertNotIn('nueva-clave-ficticia', salida.getvalue())

    @patch('clientes.management.commands.comprobar_groq.consultar_ia', side_effect=ErrorRecomendacion('Clave rechazada', 503))
    @patch('clientes.management.commands.comprobar_groq.subprocess.run')
    def test_fallo_no_arranca_servidor(self, ejecutar, consultar):
        with self.assertRaisesMessage(CommandError, 'Clave rechazada'):
            call_command('comprobar_groq', iniciar=True, stdout=StringIO())
        ejecutar.assert_not_called()
