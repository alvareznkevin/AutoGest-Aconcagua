# Registro de ventas y ganancia

En Inventario, Registrar venta abre un resumen con comprador, fecha real, precio negociado, costo de compra y gastos vinculados. Se pueden registrar gastos del vehículo antes de confirmar. Esos gastos se guardan inmediatamente, incluso si se cancela la venta; el formulario lo informa. El precio de compra no debe anotarse otra vez como gasto.

Modelo Venta: una por vehículo, comprador protegido, fecha, precio real y costo de compra congelados al confirmar, y enlace al único ingreso automático. No se inventan ventas para los vehículos que ya estaban vendidos. El cierre está restringido a administradores; admite disponibles y reservados y rechaza vendidos y duplicados.

POST /api/finanzas/vehiculos/{id}/venta/ exige cliente, fecha, precio_venta, precio_compra_confirmado y gastos_confirmados. Si los costos cambiaron desde la vista previa se devuelve 409. Precio positivo, fecha hasta hoy; si hay pérdida exige confirmar_perdida=true. GET en esa misma ruta permite ver el resumen de costos y la venta existente.

La operación usa una transacción y bloqueo del vehículo. Reutiliza el movimiento automático sin duplicar ingresos y le asigna la fecha real de venta. Si falla, revierte los cambios. Restricciones únicas impiden dos fichas de venta por vehículo. Las pruebas incluyen rollback y reenvío duplicado; no se realizó prueba de estrés concurrente en PostgreSQL.

Ganancia = precio real de venta - costo de compra congelado - gastos vinculados no excluidos. Los gastos generales sin vehículo no entran en esta ganancia. Los gastos que se agregan o excluyen posteriormente actualizan la ganancia; se imputan a la venta del vehículo, independientemente de la fecha de pago. El dashboard selecciona las ventas por fecha de venta. La caja y sus gráficos mantienen los movimientos por fecha de pago. No sumar o restar ambas métricas entre sí: son perspectivas distintas. No es un cálculo de utilidad neta contable, impuestos ni financiamiento.

Una venta registrada no se puede alterar mediante Editar vehículo ni eliminando el ingreso. Tampoco puede eliminarse el cliente o vehículo con historial protegido. La ficha se consulta en Django Admin, sin alta manual ni eliminación. No se implementó anulación o devolución; requiere un flujo separado con trazabilidad.

Para gastos posteriores, Registrar movimiento en el dashboard permite elegir vehículo. Se muestran las últimas cinco fichas de venta dentro del período y la cantidad de vendidos sin ficha histórica, que no se incluyen en la ganancia calculada.

Despliegue: aplicar finanzas/0003_venta.py con manage.py migrate --noinput. En Railway conservar migraciones antes del arranque. No exportar la configuración privada .env.* ni SQLite local.

## Resultado del período (dashboard principal)
Resultado = ingresos de ventas con ficha + otros ingresos manuales del período - costo de compra de los vehículos vendidos - gastos vinculados a esos vehículos - gastos generales del período. No se suma otra vez el ingreso automático de una venta. Los gastos vinculados tampoco se restan como gastos generales. Los costos del vehículo se reconocen por fecha de venta; los otros ingresos y gastos generales, por la fecha del movimiento. Los gastos del stock aún no vendido se muestran diferidos en Ver cálculo y se descuentan al vender. No es saldo bancario ni incorpora costos no ingresados.

El endpoint entrega resultado_periodo con total, desglose y serie mensual; el gráfico principal usa esa serie. El detalle de ventas conserva su margen individual. Las ventas antiguas sin ficha no se reconstruyen ni sus ingresos automáticos se reclasifican como otros ingresos; se muestra una advertencia de datos incompletos. Los movimientos siguen disponibles en su sección secundaria. Evitar registrar manualmente otra vez cobros o costos ya presentes.
