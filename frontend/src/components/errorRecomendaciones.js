export function mensajeErrorRecomendaciones(error) {
  const estado = error.response?.status;
  const datos = error.response?.data;
  if (typeof datos?.detail === 'string') return datos.detail;
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'La consulta tardó demasiado. Comprueba la terminal de Django antes de volver a intentarlo.';
  }
  if (!error.response) return 'No se pudo conectar con Django. Comprueba que el backend esté iniciado y que la URL de la API sea correcta.';
  if (estado === 400 && datos && typeof datos === 'object') {
    const etiquetas = { preferencias: 'Preferencias', presupuesto_maximo: 'Presupuesto máximo', transmision: 'Transmisión', tipo: 'Tipo' };
    const mensajes = Object.entries(etiquetas).flatMap(([campo, etiqueta]) => {
      const errores = datos[campo];
      return Array.isArray(errores) ? errores.filter(e => typeof e === 'string').map(e => `${etiqueta}: ${e}`) : [];
    });
    if (mensajes.length) return mensajes.join(' ');
  }
  if (estado === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (estado === 403) return 'Necesitas permisos de administrador para generar recomendaciones.';
  if (estado === 404) return 'No se encontró el cliente o la ruta de recomendaciones. Verifica que Django esté ejecutando la versión actual del proyecto.';
  if (estado >= 500) return `El backend devolvió un error (HTTP ${estado}). Revisa el traceback en la terminal donde ejecutaste runserver.`;
  return `No fue posible generar las recomendaciones (HTTP ${estado}). Intenta nuevamente.`;
}
