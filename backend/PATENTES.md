# Consulta de patentes chilenas

Proveedor: GetAPI Chile. Contrato: https://www.getapi.cl/docs/

Configurar `GETAPI_API_KEY` como variable de entorno del backend (en Railway, en Variables del servicio Django) y reiniciar el servicio. No colocar la clave en variables `VITE_*` ni en el repositorio. El archivo `.env.example` es documentación: Django no carga archivos `.env` automáticamente.

Para desarrollo en PowerShell, definir `$env:GETAPI_API_KEY` en la terminal que ejecuta Django y luego arrancar `manage.py runserver`. La clave se obtiene en la cuenta del proveedor; revisar su plan y límites antes de habilitar consultas.

La web consulta al salir del campo patente y ofrece reintento con un botón. Solo completa campos vacíos, conserva los datos escritos manualmente y descarta respuestas si cambia la patente. Se admiten formatos de automóviles AB1234 y ABCD12, con espacios o guiones opcionales.

La API local autenticada es `GET /api/vehiculos/consultar-patente/?patente=ABCD12`. La clave nunca se devuelve al navegador. Tiene un límite de 10 consultas por minuto por usuario y un timeout de 10 segundos. El límite usa la caché de Django, por lo que en despliegues con varios procesos debe configurarse una caché compartida si se necesita un límite global.

Se completan marca, modelo, año, color, combustible, transmisión, tipo y kilometraje cuando existen y son compatibles con el formulario. El kilometraje puede ser histórico y debe verificarse. Los tipos desconocidos (por ejemplo SUV, que no existe como opción del modelo local) quedan pendientes de selección manual. Precios y estado comercial no se infieren. No se guardan vehículos hasta enviar el formulario.

Las pruebas usan respuestas simuladas. La consulta real requiere una clave válida y disponibilidad de datos del proveedor.

## Ficha, tasación y campañas

Aplicar `manage.py migrate` antes de iniciar la nueva versión. La migración 0003 agrega campos opcionales de VIN/chasis, número de motor, versión, cilindrada/motor y puertas, además de las últimas consultas de tasación y campañas. Los registros existentes se conservan.

En el inventario, abrir **Ver detalle y tasación**. Las consultas adicionales se ejecutan solo al pulsar sus botones y guardan fecha y fuente; cargar la página no consume consultas externas. Los resultados previos se conservan cuando falla una actualización. Cambiar patente invalida las consultas guardadas; cambiar VIN invalida las campañas.

- `POST /api/vehiculos/{id}/consultas/ficha/`: actualiza los campos técnicos ampliados disponibles por patente. No cambia precios ni los datos comerciales.
- `POST /api/vehiculos/{id}/consultas/tasacion/`: guarda referencia, rango, retoma y tasación fiscal cuando existen. Los datos ausentes se muestran sin información, nunca como cero. No modifica precios de compra o venta.
- `POST /api/vehiculos/{id}/consultas/recalls/`: consulta campañas por VIN de 17 caracteres. Solo interpreta un 404 documentado con `success: true` y `data: null` como ausencia de campañas. Otros errores no se muestran como un resultado limpio.

La simulación de margen usa venta menos compra menos gastos estimados ingresados en pantalla. Esos gastos no se guardan ni se contabilizan en Finanzas. Los enlaces de campañas solo aceptan HTTPS.

Las tres rutas requieren autenticación y comparten el límite local de las consultas por patente. El proveedor puede imponer un límite menor (por ejemplo, la demo publica 2 solicitudes/minuto); si responde 429, esperar antes de reintentar. No se infiere vigencia de revisión técnica ni se certifica ausencia de recalls.
