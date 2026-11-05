import axios from 'axios';

const api = axios.create({
  baseURL: `${(import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '')}/`,
});
const renovacion = axios.create({ baseURL: api.defaults.baseURL });
let renovacionPendiente = null;

export function cerrarSesion() {
  for (const clave of ['access_token', 'refresh_token', 'user']) localStorage.removeItem(clave);
  window.dispatchEvent(new Event('autogest:sesion-cerrada'));
}

function esAutenticacion(config) {
  return /(?:^|\/)auth\/(?:login|refresh)\//.test(config.url || '');
}

async function renovarToken() {
  if (!renovacionPendiente) {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      cerrarSesion();
      throw new Error('No hay una sesión renovable.');
    }
    renovacionPendiente = renovacion.post('auth/refresh/', { refresh }).then(({ data }) => {
      // Una respuesta pendiente no puede reabrir una sesión cerrada o reemplazada.
      if (localStorage.getItem('refresh_token') !== refresh) throw new Error('La sesión cambió durante la renovación.');
      if (!data.access) throw new Error('Respuesta de renovación inválida.');
      localStorage.setItem('access_token', data.access);
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
      return data.access;
    }).catch(error => {
      if ([400, 401, 403].includes(error.response?.status) && localStorage.getItem('refresh_token') === refresh) cerrarSesion();
      throw error;
    }).finally(() => { renovacionPendiente = null; });
  }
  return renovacionPendiente;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && !esAutenticacion(config)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(response => response, async error => {
  const config = error.config;
  if (error.response?.status !== 401 || !config || esAutenticacion(config) || config._reintentada || config.signal?.aborted) throw error;
  config._reintentada = true;
  const actual = localStorage.getItem('access_token');
  const enviado = config.headers?.Authorization;
  const token = actual && enviado !== `Bearer ${actual}` ? actual : await renovarToken();
  if (config.signal?.aborted) throw error;
  config.headers.Authorization = `Bearer ${token}`;
  return api.request(config);
});

export default api;
