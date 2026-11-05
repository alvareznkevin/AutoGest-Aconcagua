import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

const almacen = new Map();
globalThis.localStorage = {
  getItem: key => almacen.get(key) ?? null,
  setItem: (key, value) => almacen.set(key, String(value)),
  removeItem: key => almacen.delete(key),
};
globalThis.window = new EventTarget();
let responder;
axios.defaults.adapter = config => responder(config);
const { default: api, cerrarSesion } = await import('../src/api.js');
const ok = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
function rechazar(config, status) {
  throw new axios.AxiosError('Error simulado', 'ERR_BAD_REQUEST', config, null, { config, status, data: {} });
}
beforeEach(() => {
  almacen.clear();
  localStorage.setItem('access_token', 'vencido');
  localStorage.setItem('refresh_token', 'renovable');
  localStorage.setItem('user', '{}');
});

test('renueva una sola vez para solicitudes concurrentes y reintenta con el nuevo token', async () => {
  let renovaciones = 0;
  responder = async config => {
    if (config.url === 'auth/refresh/') {
      renovaciones++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return ok(config, { access: 'nuevo' });
    }
    if (config.headers.Authorization === 'Bearer vencido') rechazar(config, 401);
    assert.equal(config.headers.Authorization, 'Bearer nuevo');
    return ok(config, ['resultado']);
  };
  const resultados = await Promise.all([api.get('clientes/'), api.get('vehiculos/')]);
  assert.equal(renovaciones, 1);
  assert.equal(resultados.length, 2);
  assert.equal(localStorage.getItem('access_token'), 'nuevo');
});

test('refresh vencido cierra la sesión y conserva otras preferencias', async () => {
  localStorage.setItem('tema', 'oscuro');
  responder = async config => rechazar(config, 401);
  await assert.rejects(api.get('clientes/'));
  assert.equal(localStorage.getItem('access_token'), null);
  assert.equal(localStorage.getItem('user'), null);
  assert.equal(localStorage.getItem('tema'), 'oscuro');
});

test('un error de red al renovar no borra la sesión', async () => {
  responder = async config => {
    if (config.url === 'auth/refresh/') throw new axios.AxiosError('Sin conexión', 'ERR_NETWORK', config);
    rechazar(config, 401);
  };
  await assert.rejects(api.get('vehiculos/'));
  assert.equal(localStorage.getItem('refresh_token'), 'renovable');
});

test('credenciales incorrectas en login no provocan renovación', async () => {
  let llamadas = 0;
  responder = async config => { llamadas++; assert.equal(config.url, 'auth/login/'); rechazar(config, 401); };
  await assert.rejects(api.post('auth/login/', { username: 'admin', password: 'incorrecta' }));
  assert.equal(llamadas, 1);
});

test('una respuesta 401 repetida no genera un bucle', async () => {
  let llamadas = 0;
  responder = async config => {
    llamadas++;
    if (config.url === 'auth/refresh/') return ok(config, { access: 'nuevo' });
    rechazar(config, 401);
  };
  await assert.rejects(api.get('vehiculos/'));
  assert.equal(llamadas, 3);
});

test('cerrar sesión durante la renovación impide restaurar los tokens', async () => {
  responder = async config => {
    if (config.url === 'auth/refresh/') {
      cerrarSesion();
      return ok(config, { access: 'nuevo' });
    }
    rechazar(config, 401);
  };
  await assert.rejects(api.get('clientes/'));
  assert.equal(localStorage.getItem('access_token'), null);
});
