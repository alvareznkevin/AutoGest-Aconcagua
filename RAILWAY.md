# AutoGest en Railway

## Servicios del mismo repositorio
1. Crear un proyecto Railway y agregar PostgreSQL.
2. Agregar un servicio desde GitHub para Django. Root Directory: `/backend`.
3. Agregar otro servicio del mismo repositorio para React. Root Directory: `/frontend`.
4. En cada servicio, usar su archivo railway.json (si Railway pide la ruta desde la raiz del repositorio: `/backend/railway.json` y `/frontend/railway.json`). Los Dockerfiles construyen y sirven la aplicacion; no usar runserver ni vite dev en produccion.

## Backend
Variables:
- `DEBUG=false`
- `SECRET_KEY`: secreto nuevo, largo y aleatorio; nunca incluirlo en Git.
- `DATABASE_URL=${{Postgres.DATABASE_URL}}` (reemplazar Postgres si el servicio tiene otro nombre).
- `ALLOWED_HOSTS`: dominio publico del backend, sin https.
- `CORS_ALLOWED_ORIGINS`: URL HTTPS del frontend, sin barra final.
- `CSRF_TRUSTED_ORIGINS`: URL HTTPS del backend, sin barra final.

Generar dominio publico en Settings / Networking. Las migraciones se ejecutan antes de cada despliegue y los estaticos se construyen en Docker. El chequeo `/health/` comprueba que el servidor responde.

## Frontend
Generar dominio publico. Configurar `VITE_API_URL=https://DOMINIO-BACKEND/api/` y desplegar nuevamente. Esta variable se incorpora durante la compilacion. Nginx admite recargar rutas como `/clientes/registrar`.

## Administrador y datos
En la consola del servicio Django ejecutar `python manage.py createsuperuser` de forma interactiva. No subir contrasenas a Git. La base nueva empieza vacia: los clientes y cuentas del SQLite local no se transfieren automaticamente. Para migrarlos, hacer una copia de seguridad y una exportacion/importacion controlada.

## Comprobacion
1. Backend `/health/`: 200 y status ok.
2. `/admin/`: estilos cargados y acceso del administrador.
3. Frontend: iniciar sesion, registrar un cliente y comprobar el listado y Django admin.
4. Recargar directamente `/clientes` y `/clientes/registrar`.
5. Comprobar que la API rechace la consulta de clientes sin autenticacion.

## Desarrollo local
Sin variables de produccion, Django conserva SQLite y DEBUG=true. Instalar `backend/requirements.txt` en el entorno virtual. El frontend utiliza http://127.0.0.1:8000/api/ si VITE_API_URL no esta definida.
