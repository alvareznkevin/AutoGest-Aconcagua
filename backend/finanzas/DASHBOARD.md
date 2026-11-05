# Resumen del negocio

El inicio muestra el dashboard debajo de los módulos de clientes y vehículos. El resumen y el registro de movimientos requieren un usuario administrador (`is_staff`), al igual que la gestión de clientes.

## Indicadores

- Stock: vehículos disponibles más reservados, según su estado actual.
- Vendidos: cantidad actual de vehículos con estado vendido. Es un acumulado del inventario, no ventas fechadas dentro del período.
- Ingresos y gastos: suma de los movimientos registrados desde el primer día del período hasta hoy, con fecha de Chile (`America/Santiago`). El selector incluye el mes actual y los 2, 5 u 11 meses anteriores.
- Saldo del período: ingresos menos gastos registrados. No representa utilidad contable ni saldo bancario.
- Inversión en stock: suma de los precios de compra de los vehículos disponibles y reservados. No se registra automáticamente como gasto.

Los gráficos usan datos reales; los meses sin movimientos se completan con cero. Sin movimientos se muestra una invitación a registrar el primero. No se consulta GetAPI para construir los indicadores.

## Registro

El botón **Registrar movimiento** permite anotar otros ingresos o gastos realizados, monto entero mayor que cero, fecha hasta hoy y descripción. No modifica el estado del inventario. No registrar manualmente otra vez las ventas que el inventario ya generó automáticamente.

Marcar un vehículo como **vendido** (o crearlo vendido) genera un ingreso por su precio de venta con fecha local de Chile. Se exige un precio mayor que cero para ese estado. La operación es transaccional; una restricción de base de datos permite un único ingreso automático por vehículo. Funciona tanto desde la API como al guardar desde Django Admin. Cambiar el precio de un vendido actualiza el monto, conservando su fecha. Volver a disponible o reservado excluye ese ingreso; venderlo de nuevo reactiva el mismo registro con la fecha nueva. El stock y la distribución de estados se calculan del inventario actual.

**Eliminar** solicita confirmación en la lista y excluye el movimiento de los totales, gráficos y listado mediante una marca interna, conservando su historial en la base de datos. Eliminar el ingreso automático no cambia el estado del vehículo ni se deshace al editar sus datos. Una nueva transición de disponible/reservado a vendido sí constituye una nueva venta y reactiva el ingreso. Los movimientos eliminados se identifican en Django Admin.

Los vehículos ya vendidos antes de esta funcionalidad conservan su estado. No se inventan ingresos con fecha histórica ni se duplican posibles movimientos manuales previos; para reflejarlos, registrar su ingreso manualmente con la fecha real. Las ediciones ordinarias de esos vehículos no crean un ingreso nuevo.

Los gastos de la simulación de margen en la ficha vehicular siguen siendo una simulación; no generan movimientos. Para incorporarlos al dashboard hay que registrar el pago real.

## Rutas y despliegue

- `GET /api/finanzas/dashboard/?meses=6&pagina=1` acepta 3, 6 o 12 meses y devuelve indicadores, serie mensual y movimientos paginados (cinco por página). La paginación no cambia las sumas del período.
- `POST /api/finanzas/movimientos/` crea un movimiento (`tipo`, `monto`, `fecha`, `descripcion`, `vehiculo` opcional).
- `DELETE /api/finanzas/movimientos/{id}/` excluye un movimiento existente. Requiere administrador, al igual que las otras rutas.
- Aplicar `manage.py migrate` al desplegar. La migración de finanzas crea la tabla sin alterar registros existentes ni añadir datos de ejemplo.

Pruebas: `manage.py test finanzas`. Cubren períodos entre años, límites de fecha, meses vacíos, cantidades de stock, sumas, validaciones y acceso de administrador.
