import './RegistrarVenta.css';
import { useEffect, useRef, useState } from 'react';
import { CarFront, CircleCheck, Plus, RefreshCw, Trash2, X, TrendingUp, Wallet } from 'lucide-react';
import api from '../api';
import NumeroVehiculo from './NumeroVehiculo';
import './IndicadoresDashboard.css';
import './DashboardResumen.css';
import { escalaVentas } from './escalaVentas';

const pesos = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const compacto = new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 });
const fechaCorta = valor => new Date(`${valor}T12:00:00`).toLocaleDateString('es-CL');
const mesCorto = valor => new Date(`${valor}T12:00:00`).toLocaleDateString('es-CL', { month: 'short' });
const hoyChile = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' }).format(new Date());

function GraficoVentas({ serie, campo, titulo }) {
  const escala = escalaVentas(serie, campo);
  const anchoGrupo = 600 / Math.max(1, serie.length);
  const anchoBarra = Math.min(35, anchoGrupo * .52);
  const hayVentas = serie.some(mes => mes.ventas > 0 || (campo === 'resultado' && mes.movimientos > 0));
  const formato = valor => campo === 'ventas' ? String(valor) : pesos.format(valor);
  return <>
    {hayVentas ? <svg className="sales-chart" viewBox="0 0 720 270" role="img" aria-label={`${titulo}. Consulta los valores exactos en Ver datos del gráfico.`}>
      {escala.ticks.map(valor => <g key={valor}><line x1="88" x2="705" y1={escala.y(valor)} y2={escala.y(valor)} stroke={valor === 0 ? '#a7beb3' : '#e4ece8'} strokeWidth={valor === 0 ? 1.5 : 1} strokeDasharray={valor === 0 ? undefined : '4 5'}/><text x="76" y={escala.y(valor) + 4} textAnchor="end">{campo === 'ventas' ? valor : compacto.format(valor)}</text></g>)}
      {serie.map((mes, index) => {
        const valor = mes[campo]; const posicion = escala.y(valor); const x = 95 + index * anchoGrupo + anchoGrupo / 2;
        return <g key={mes.mes}><title>{new Date(`${mes.mes}T12:00:00`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}: {formato(valor)}</title><rect x={x - anchoBarra / 2} y={Math.min(posicion, escala.cero)} width={anchoBarra} height={Math.abs(escala.cero - posicion)} rx="4" fill={valor < 0 ? '#b55d50' : campo === 'ventas' ? '#537c89' : '#16776b'}/><text x={x} y="245" textAnchor="middle">{mesCorto(mes.mes)} {new Date(`${mes.mes}T12:00:00`).getFullYear().toString().slice(-2)}</text></g>;
      })}
    </svg> : <div className="sales-chart-empty"><CarFront size={28}/><strong>{campo === 'resultado' ? 'Sin actividad registrada en este período' : 'Aún no hay ventas registradas en este período'}</strong><p>{campo === 'resultado' ? 'Registra ventas, otros ingresos o gastos generales para ver su evolución.' : 'Al confirmar una venta desde Inventario, sus resultados aparecerán aquí.'}</p></div>}
    <details className="chart-data"><summary>Ver datos del gráfico</summary><div className="insights-table-scroll"><table><caption>{titulo}</caption><thead><tr><th>Mes</th><th>{campo === 'ventas' ? 'Vehículos vendidos' : 'Resultado (CLP)'}</th></tr></thead><tbody>{serie.map(mes => <tr key={mes.mes}><th>{new Date(`${mes.mes}T12:00:00`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</th><td>{formato(mes[campo])}</td></tr>)}</tbody></table></div></details>
  </>;
}

function FormularioMovimiento({ alGuardar, alCerrar }) {
  const [valores, setValores] = useState({ tipo: 'ingreso', monto: '0', fecha: hoyChile(), descripcion: '', vehiculo: '' });
  const [vehiculos, setVehiculos] = useState([]);
  const [errorVehiculos, setErrorVehiculos] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const descripcionRef = useRef(null);
  const pendienteRef = useRef(false);
  useEffect(() => { descripcionRef.current?.focus(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        let url = 'vehiculos/'; const filas = [];
        while (url) { const { data } = await api.get(url, { signal: controller.signal }); filas.push(...(Array.isArray(data) ? data : data.results)); url = Array.isArray(data) ? null : data.next; }
        if (!controller.signal.aborted) setVehiculos(filas);
      } catch { if (!controller.signal.aborted) setErrorVehiculos('No se pudo cargar el inventario. Puedes registrar un movimiento general o volver a abrir el formulario.'); }
    })();
    return () => controller.abort();
  }, []);
  const actualizar = event => { setValores(previos => ({ ...previos, [event.target.name]: event.target.value })); setError(''); };
  async function guardar(event) {
    event.preventDefault();
    if (pendienteRef.current) return;
    if (!/^\d+$/.test(valores.monto) || Number(valores.monto) < 1) { setError('El monto debe ser mayor que $0.'); return; }
    pendienteRef.current = true;
    setGuardando(true);
    setError('');
    try {
      await api.post('finanzas/movimientos/', { ...valores, descripcion: valores.descripcion.trim(), vehiculo: valores.vehiculo ? Number(valores.vehiculo) : null });
      alGuardar();
    } catch (err) {
      const datos = err.response?.data;
      setError(err.response?.status === 400 ? Object.values(datos || {}).flat().join(' ') : 'No se pudo guardar el movimiento. Revisa tu conexión e inténtalo nuevamente.');
    } finally { pendienteRef.current = false; setGuardando(false); }
  }
  return <form className="insights-movement-form" onSubmit={guardar} aria-label="Registrar movimiento financiero">
    <div className="insights-form-heading"><div><h3>Registrar ingreso o gasto</h3><p>Anota un cobro o pago realizado. No modifica el estado de los vehículos.</p></div><button type="button" className="insights-icon-button" onClick={alCerrar} disabled={guardando} aria-label="Cerrar formulario"><X size={19}/></button></div>
    <fieldset disabled={guardando}><label className="movement-description">Descripción<input ref={descripcionRef} name="descripcion" value={valores.descripcion} onChange={actualizar} maxLength={200} required placeholder="Ej. Venta de vehículo o reparación de motor"/></label><label>Tipo<select name="tipo" value={valores.tipo} onChange={actualizar}><option value="ingreso">Ingreso</option><option value="gasto">Gasto</option></select></label><label>Monto (CLP)<span className="movement-money"><NumeroVehiculo name="monto" value={valores.monto} onChange={actualizar} moneda required aria-label="Monto en pesos chilenos"/></span></label><label>Fecha<input type="date" name="fecha" value={valores.fecha} max={hoyChile()} onChange={actualizar} required/></label><label className="movement-description">Vehículo asociado (opcional)<select name="vehiculo" value={valores.vehiculo} onChange={actualizar}><option value="">Movimiento general, sin vehículo</option>{vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} · {v.marca} {v.modelo}</option>)}</select><small>Los gastos vinculados se descuentan de la ganancia del vehículo. No registres su precio de compra nuevamente como gasto.</small></label></fieldset>{errorVehiculos && <p className="sale-help">{errorVehiculos}</p>}
    {error && <p className="insights-error" role="alert">{error}</p>}<div className="insights-form-actions"><button type="button" className="button-secondary" onClick={alCerrar} disabled={guardando}>Cancelar</button><button type="submit" className="button-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar movimiento'}</button></div>
  </form>;
}

export default function IndicadoresDashboard() {
  const [meses, setMeses] = useState('6');
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [aviso, setAviso] = useState('');
  const [pagina, setPagina] = useState(1);
  const [eliminar, setEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const eliminacionRef = useRef(false);
  const registrarRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    api.get('finanzas/dashboard/', { params: { meses, pagina }, signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setResultado({ meses, revision, pagina, data });
    }).catch(error => {
      if (!controller.signal.aborted) setResultado({ meses, revision, pagina, error: error.response?.status === 403 ? 'El resumen del negocio requiere acceso de administrador.' : 'No se pudo cargar el resumen. Revisa tu conexión y vuelve a intentarlo.' });
    });
    return () => controller.abort();
  }, [meses, revision, pagina]);
  const cargando = resultado?.meses !== meses || resultado?.revision !== revision || resultado?.pagina !== pagina;
  const datos = !cargando && resultado?.data;
  const cerrarFormulario = () => { setMostrarFormulario(false); registrarRef.current?.focus(); };
  const inventario = datos?.inventario;


  async function eliminarMovimiento() {
    if (!eliminar || eliminacionRef.current) return;
    eliminacionRef.current = true;
    setEliminando(true);
    setErrorEliminar('');
    try {
      await api.delete(`finanzas/movimientos/${eliminar.id}/`);
      setEliminar(null);
      setAviso('Movimiento eliminado. Actualizando indicadores y gráficos.');
      setRevision(valor => valor + 1);
    } catch {
      setErrorEliminar('No se pudo eliminar el movimiento. Revisa tu conexión y vuelve a intentarlo.');
    } finally { eliminacionRef.current = false; setEliminando(false); }
  }

  return <section className="business-insights" aria-labelledby="business-title">
    <div className="insights-heading"><div><span className="section-kicker">VISIÓN DEL NEGOCIO</span><h2 id="business-title">Resumen del negocio</h2><p>Stock actual, ventas y resultados del período seleccionado.</p></div><div className="insights-controls"><label><span className="insights-sr-only">Período financiero</span><select value={meses} onChange={event => { setMeses(event.target.value); setPagina(1); setEliminar(null); }}><option value="3">Últimos 3 meses</option><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option></select></label><button className="insights-icon-button" aria-label="Actualizar indicadores" disabled={cargando} onClick={() => setRevision(valor => valor + 1)}><RefreshCw size={18}/></button><button ref={registrarRef} className="button-primary" onClick={() => { setMostrarFormulario(valor => !valor); setAviso(''); }} aria-expanded={mostrarFormulario} aria-controls="movement-form"><Plus size={17}/>Registrar movimiento</button></div></div>
    {aviso && <p className="insights-notice" role="status">{aviso}</p>}
    {mostrarFormulario && <div id="movement-form"><FormularioMovimiento alCerrar={cerrarFormulario} alGuardar={() => { cerrarFormulario(); setPagina(1); setAviso('Movimiento guardado. El resumen se actualizará con los datos del período seleccionado.'); setRevision(valor => valor + 1); }}/></div>}
    <div aria-busy={cargando}>{cargando ? <div className="insights-loading" role="status">Cargando indicadores del negocio…</div> : resultado.error ? <div className="insights-loading"><p className="insights-error" role="alert">{resultado.error}</p><button className="button-secondary" onClick={() => setRevision(valor => valor + 1)}>Reintentar</button></div> : datos && <>
      <div className="insights-metrics dashboard-key-metrics">{[
        { etiqueta: 'Vehículos en stock', valor: datos.stock, nota: `${inventario.disponible} disponibles · ${inventario.reservado} reservados`, Icono: CarFront, clase: 'stock' },
        { etiqueta: 'Ventas del período', valor: datos.ventas ? datos.ventas.cantidad : '—', nota: 'Ventas con comprador y fecha registrados', Icono: CircleCheck, clase: 'sold' },
        { etiqueta: 'Resultado del período', valor: datos.resultado_periodo ? pesos.format(datos.resultado_periodo.total) : '—', nota: 'Ventas y otros ingresos − costos y gastos', detalle: 'Incluye los gastos generales registrados', Icono: TrendingUp, clase: datos.resultado_periodo?.total < 0 ? 'loss' : 'income' },
        { etiqueta: 'Capital en inventario', valor: pesos.format(datos.inversion_stock), nota: 'Precio de compra del stock actual', detalle: 'Disponibles y reservados; no es ganancia', Icono: Wallet, clase: 'balance' },
      ].map(({ etiqueta, valor, nota, detalle, Icono, clase }) => <article className={`insights-metric metric-${clase}`} key={etiqueta}><div><h3>{etiqueta}</h3><span className="insights-metric-icon"><Icono size={19}/></span></div><strong>{valor}</strong><p>{nota}</p>{detalle && <small className="metric-context">{detalle}</small>}</article>)}</div>
      {datos.resultado_periodo?.serie ? <div className="dashboard-sales-charts"><section className="insights-panel"><div className="insights-panel-heading"><div><h3>Resultado del período por mes</h3><p>Incluye compra, gastos del auto y gastos generales · CLP</p></div></div><GraficoVentas serie={datos.resultado_periodo.serie} campo="resultado" titulo="Resultado del período por mes"/><p className="chart-footnote">Los resultados negativos se muestran bajo cero. Cada gasto se descuenta una sola vez.</p></section><section className="insights-panel"><div className="insights-panel-heading"><div><h3>Vehículos vendidos por mes</h3><p>Cantidad de ventas con ficha registrada</p></div></div><GraficoVentas serie={datos.ventas.serie} campo="ventas" titulo="Vehículos vendidos por mes"/><p className="chart-footnote">El mes corresponde a la fecha real de venta.</p></section></div> : <p className="dashboard-data-note">Los gráficos de ventas estarán disponibles al actualizar el backend con esta versión.</p>}
      {datos.resultado_periodo && <details className="dashboard-details result-breakdown"><summary>Ver cálculo del resultado<span>{pesos.format(datos.resultado_periodo.total)}</span></summary><div className="dashboard-details-body"><dl className="result-calculation">
        <div><dt>Ingresos por ventas registradas</dt><dd>{pesos.format(datos.resultado_periodo.ingresos_ventas)}</dd></div>
        <div><dt>Otros ingresos registrados</dt><dd>+ {pesos.format(datos.resultado_periodo.otros_ingresos)}</dd></div>
        <div><dt>Compra de vehículos vendidos</dt><dd>− {pesos.format(datos.resultado_periodo.costo_compra)}</dd></div>
        <div><dt>Gastos de vehículos vendidos</dt><dd>− {pesos.format(datos.resultado_periodo.gastos_vehiculos_vendidos)}</dd></div>
        <div><dt>Gastos generales del período</dt><dd>− {pesos.format(datos.resultado_periodo.gastos_generales)}</dd></div>
        <div className={datos.resultado_periodo.total < 0 ? 'result-total negative' : 'result-total'}><dt>Resultado del período</dt><dd>{pesos.format(datos.resultado_periodo.total)}</dd></div>
      </dl><p>Los costos y gastos vinculados a un vehículo se reconocen en el mes de su venta, aunque se hayan pagado antes o después. Los otros ingresos manuales y los gastos generales se incluyen según su fecha de registro.</p>
      {datos.resultado_periodo.gastos_stock_pendientes > 0 && <p className="dashboard-data-note">{pesos.format(datos.resultado_periodo.gastos_stock_pendientes)} en gastos vinculados a vehículos aún en stock. Se descontarán al registrar su venta; todavía no forman parte de este resultado.</p>}
      {datos.ventas?.vendidos_sin_registro > 0 && <p className="dashboard-data-note">Hay {datos.ventas.vendidos_sin_registro} vehículos marcados vendidos sin ficha de venta. Su venta y costos no se incluyen hasta contar con un registro completo; los ingresos automáticos antiguos no se suman como otros ingresos.</p>}
      <p>El cálculo depende de los datos registrados. No representa saldo bancario ni incorpora automáticamente impuestos o costos no ingresados. Evita anotar otra vez un ingreso o gasto ya registrado.</p></div></details>}
      <p className="dashboard-period-note">Período del resultado y ventas: {fechaCorta(datos.desde)} al {fechaCorta(datos.hasta)}. Stock y capital muestran la situación actual.</p>
      {datos.ventas && <details className="dashboard-details sales-summary"><summary>Ver ventas y cálculo del margen<span>{datos.ventas.cantidad} ventas registradas</span></summary><div className="dashboard-details-body"><p>Ingresos por ventas: <strong>{pesos.format(datos.ventas.ingresos)}</strong> · Compra: <strong>{pesos.format(datos.ventas.costo_compra)}</strong> · Gastos vinculados: <strong>{pesos.format(datos.ventas.gastos)}</strong>.</p>
      {datos.ventas.ultimas.length > 0 ? <div className="insights-table-scroll"><table><caption>Últimas cinco ventas del período</caption><thead><tr><th>Fecha</th><th>Vehículo</th><th>Comprador</th><th>Precio real</th><th>Margen</th></tr></thead><tbody>{datos.ventas.ultimas.map(v => <tr key={v.id}><td>{fechaCorta(v.fecha)}</td><td>{v.patente}</td><td>{v.comprador}</td><td>{pesos.format(Number(v.precio_venta))}</td><td>{pesos.format(v.ganancia)}</td></tr>)}</tbody></table></div> : <p>No hay ventas registradas en este período. Registra una venta desde Inventario para ver su ganancia.</p>}
      {datos.ventas.vendidos_sin_registro > 0 && <p className="dashboard-data-note">{datos.ventas.vendidos_sin_registro} vehículos figuran vendidos sin ficha de venta. No se incluyen en la ganancia calculada.</p>}<p>Los gastos vinculados posteriores actualizan la ganancia de la venta. Los gastos generales se muestran en movimientos; esta cifra no representa utilidad neta.</p></div></details>}
      {datos.ultimos_movimientos.length > 0 && <details className="dashboard-details recent-movements"><summary>Movimientos registrados<span>{datos.cantidad_movimientos} registros</span></summary><div className="dashboard-details-body"><div className="dashboard-flow-totals"><span>Ingresos <strong>{pesos.format(datos.ingresos)}</strong></span><span>Gastos <strong>{pesos.format(datos.gastos)}</strong></span><span>Diferencia <strong>{pesos.format(datos.saldo)}</strong></span></div><p>Son cobros y pagos anotados. La diferencia no representa ganancia: la compra del vehículo no se registra automáticamente como gasto aquí.</p>
        {eliminar && <div className="movement-delete-confirm" role="group" aria-label="Confirmar eliminación de movimiento"><p>¿Eliminar «{eliminar.descripcion}» por {pesos.format(Number(eliminar.monto))}?</p><small>Dejará de contarse en los ingresos, gastos y gráficos.{eliminar.automatico ? ' El vehículo seguirá vendido. Este ingreso no se volverá a generar al editar sus datos.' : ''}</small><div><button type="button" className="button-secondary" disabled={eliminando} onClick={() => { setEliminar(null); setErrorEliminar(''); }}>Cancelar</button><button type="button" className="button-secondary movement-delete-button" disabled={eliminando} onClick={eliminarMovimiento}>{eliminando ? 'Eliminando…' : 'Sí, eliminar movimiento'}</button></div>{errorEliminar && <p className="insights-error" role="alert">{errorEliminar}</p>}</div>}
        <div className="insights-table-scroll"><table><thead><tr><th>Descripción</th><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Acciones</th></tr></thead><tbody>{datos.ultimos_movimientos.map(movimiento => <tr key={movimiento.id}><td>{movimiento.descripcion}{movimiento.automatico && <small className="automatic-sale-label">Venta automática</small>}</td><td>{fechaCorta(movimiento.fecha)}</td><td><span className={`movement-badge ${movimiento.tipo}`}>{movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span></td><td>{pesos.format(Number(movimiento.monto))}</td><td><button type="button" className="insights-icon-button movement-delete-button" aria-label={`Eliminar ${movimiento.descripcion}`} disabled={eliminando || movimiento.venta_registrada} title={movimiento.venta_registrada ? 'Ingreso protegido de una venta registrada' : 'Eliminar movimiento'} onClick={() => { setEliminar(movimiento); setErrorEliminar(''); }}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>
        {datos.paginas > 1 && <nav className="movement-pagination" aria-label="Páginas de movimientos"><button className="button-secondary" disabled={datos.pagina <= 1 || eliminando} onClick={() => { setEliminar(null); setPagina(datos.pagina - 1); }}>Anterior</button><span>Página {datos.pagina} de {datos.paginas}</span><button className="button-secondary" disabled={datos.pagina >= datos.paginas || eliminando} onClick={() => { setEliminar(null); setPagina(datos.pagina + 1); }}>Siguiente</button></nav>}
      </div></details>}
      <div className="insights-footnote"><span>{datos.clientes} clientes registrados · Actualizado {new Date(datos.actualizado).toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit' })}</span><p>Stock actual. Ventas y movimientos según el período elegido. El resultado incluye compra de autos vendidos, gastos vinculados, otros ingresos y gastos generales registrados. Ver cálculo para conocer su alcance.</p></div>
    </>}</div>
  </section>;
}
