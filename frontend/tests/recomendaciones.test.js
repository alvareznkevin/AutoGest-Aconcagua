import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeErrorRecomendaciones } from '../src/components/errorRecomendaciones.js';
test('distingue conexión, timeout y error de servidor sin mostrar HTML', () => {
  assert.match(mensajeErrorRecomendaciones({}), /conectar con Django/);
  assert.match(mensajeErrorRecomendaciones({ code: 'ECONNABORTED' }), /tardó demasiado/);
  const mensaje = mensajeErrorRecomendaciones({ response: { status: 500, data: '<html>secreto</html>' } });
  assert.match(mensaje, /HTTP 500/);
  assert.ok(!mensaje.includes('secreto'));
});
test('muestra validaciones por campo y el mensaje controlado del proveedor', () => {
  assert.equal(mensajeErrorRecomendaciones({ response: { status: 400, data: { presupuesto_maximo: ['Debe ser positivo.'] } } }), 'Presupuesto máximo: Debe ser positivo.');
  assert.equal(mensajeErrorRecomendaciones({ response: { status: 503, data: { detail: 'Falta GROQ_API_KEY' } } }), 'Falta GROQ_API_KEY');
});
