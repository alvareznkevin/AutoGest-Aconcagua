# Recomendaciones para clientes

En Clientes > Recomendar vehículos, revisar preferencias y filtros antes de generar.
Backend: configurar GROQ_API_KEY y opcionalmente GROQ_MODEL (por defecto openai/gpt-oss-120b). Reiniciar/desplegar Railway. La clave GETAPI_API_KEY de patentes no sirve para Groq. Obtener una clave en Groq Console, revisar condiciones y cuota del proveedor. No subir claves a Git ni definirlas como VITE_*.

POST /api/clientes/{id}/recomendaciones/ requiere administrador y acepta preferencias (obligatorio, hasta 1000 caracteres), presupuesto_maximo (entero positivo opcional), tipo y transmision opcionales. No modifica clientes, inventario ni movimientos financieros. No requiere migraciones.

La consulta se ejecuta solo al enviar el formulario; envía a Groq las preferencias revisadas, filtros y datos comerciales de hasta 15 candidatos. No incluye identidad, contacto, patente, fotos, VIN ni precio de compra. El texto libre puede contener datos personales: revisarlo antes de enviar. Un consentimiento explícito en pantalla informa del proveedor. El backend limita consultas a 5/min por usuario usando la caché local; varios procesos requieren caché compartida para un límite global.

Inventario: solo disponibles con precio positivo, filtrados obligatoriamente por presupuesto, transmisión y tipo. Hasta 15 candidatos por coincidencias de palabras en las preferencias y características, con desempate por precio ascendente y año descendente. Descripción limitada a 120 caracteres por candidato y contexto de datos hasta 10.000 caracteres. Se informa el total compatible y el subconjunto evaluado. IDs verificados, datos comerciales reconstruidos desde la base y disponibilidad/filtros revalidados después de consultar la IA. Las restricciones escritas solo en texto libre dependen de la interpretación del modelo: confirmar siempre.

Externos: hasta tres sugerencias de marca/modelo para buscar, inspeccionar, cotizar y comprar para reventa. No son anuncios reales, ni precio, disponibilidad o margen confirmados. No se consulta una API de anuncios ni se crean registros. Revisar características y presupuesto de una unidad concreta antes de ofertar.

Fallos: sin clave retorna 503 con mensaje, sin recomendaciones ficticias. Timeout 35 segundos, manejo de cuota/proveedor, salida JSON validada y tamaño limitado. Pruebas simulan al proveedor; no certifican la aceptación de una clave real. Documentación: https://console.groq.com/docs/structured-outputs y https://console.groq.com/docs/rate-limits

No requiere instalar SDK. REST con Authorization Bearer, esquema JSON estricto y hasta 2048 tokens de salida (incluido razonamiento); una respuesta truncada se rechaza. Estos topes reducen consumo pero no garantizan una cantidad diaria de consultas: depende de los límites de la organización y de los tokens reales. Sin clave se devuelve 503; no hay fallback silencioso a otro proveedor. Para local: definir $env:GROQ_API_KEY en PowerShell y reiniciar Django. La variable GEMINI_API_KEY ya no se usa.

## Clave local persistente
En desarrollo, si existe `backend/.env.groq.local.json`, Django lee de él GROQ_API_KEY y GROQ_MODEL, dando prioridad a esta configuración sobre las variables de la terminal. Es un archivo JSON privado excluido de Git y Docker. No se carga cuando DEBUG=false o en Railway; producción conserva las variables del servicio. No compartir ni adjuntar este archivo a entregas. Para cambiar la clave local, editarlo sin mostrar su contenido en capturas; para volver a las variables de entorno, retirar el archivo.

La evaluación del inventario y de modelos externos es independiente. La respuesta incluye explicacion_inventario y explicacion_externos. Si el backend descarta sugerencias externas por duplicadas o internos por cambios de disponibilidad, lo informa. El modelo predeterminado pasa a openai/gpt-oss-120b tras observar respuestas externas vacías con 20b. Cambiar también GROQ_MODEL en Railway; no hay garantía de resultados cuando no existen alternativas razonables.
