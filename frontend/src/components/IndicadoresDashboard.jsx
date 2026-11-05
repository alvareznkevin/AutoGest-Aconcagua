import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CarFront, CircleCheck, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import api from '../api';
import NumeroVehiculo from './NumeroVehiculo';
import './IndicadoresDashboard.css';

const pesos = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const compacto = new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 });
const fechaCorta = valor => new Date(`${valor}T12:00:00`).toLocaleDateString('es-CL');
const mesCorto = valor => new Date(`${valor}T12:00:00`).toLocaleDateString('es-CL', { month: 'short' });
const hoyChile = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' }).format(new Date());

function GraficoFlujo({ serie }) {
  const maximo = Math.max(1, ...serie.flatMap(mes => [mes.ingresos, mes.gastos]));
  const techo = Math.ceil(maximo / 4) * 4;
  const anchoGrupo = 600 / serie.length;
  const anchoBarra = Math.min(22, anchoGrupo * .28);
  const hayDatos = serie.some(mes => mes.ingresos || mes.gastos);
  return <>
    <div className="insights-legend"><span><i className="income-dot"/>Ingresos</span><span><i className="expense-dot"/>Gastos</span></div>
    {hayDatos ? <svg className="cash-chart" viewBox="0 0 720 265" role="img" aria-label="Comparación mensual de ingresos y gastos registrados. Los valores exactos están en Ver datos del gráfico.">
      {[0, 1, 2, 3, 4].map(paso => <g key={paso}><line x1="85" x2="705" y1={215 - paso * 47} y2={215 - paso * 47} stroke="#e4ece8" strokeDasharray={paso ? '4 5' : undefined}/><text x="74" y={219 - paso * 47} textAnchor="end">{compacto.format(techo * paso / 4)}</text></g>)}
      {serie.map((mes, index) => {
        const x = 95 + index * anchoGrupo + anchoGrupo / 2;
        return <g key={mes.mes}><title>{fechaCorta(mes.mes)}: ingresos {pesos.format(mes.ingresos)}, gastos {pesos.format(mes.gastos)}</title><rect x={x - anchoBarra - 2} y={215 - mes.ingresos / techo * 188} width={anchoBarra} height={mes.ingresos / techo * 188} rx="4" fill="#16776b"/><rect x={x + 2} y={215 - mes.gastos / techo * 188} width={anchoBarra} height={mes.gastos / techo * 188} rx="4" fill="#d7a45e"/><text x={x} y="245" textAnchor="middle">{mesCorto(mes.mes)}</text></g>;
      })}
    </svg> : <div className="insights-empty"><span className="empty-chart-bars" aria-hidden="true"><i/><i/><i/><i/><i/></span><strong>Tu actividad financiera comienza aquí</strong><p>Registra tu primer ingreso o gasto para ver la evolución mensual.</p></div>}
    <details className="chart-data"><summary>Ver datos del gráfico</summary><div className="insights-table-scroll"><table><caption>Movimientos por mes en pesos chilenos</caption><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th></tr></thead><tbody>{serie.map(mes => <tr key={mes.mes}><th>{new Date(`${mes.mes}T12:00:00`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</th><td>{pesos.format(mes.ingresos)}</td><td>{pesos.format(mes.gastos)}</td></tr>)}</tbody></table></div></details>
  </>;
}

function FormularioMovimiento({ alGuardar, alCerrar }) {
  const [valores, setValores] = useState({ tipo: 'ingreso', monto: '0', fecha: hoyChile(), descripcion: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const descripcionRef = useRef(null);
  const pendienteRef = useRef(false);
  useEffect(() => { descripcionRef.current?.focus(); }, []);
  const actualizar = event => { setValores(previos => ({ ...previos, [event.target.name]: event.target.value })); setError(''); };
  async function guardar(event) {
    event.preventDefault();
    if (pendienteRef.current) return;
    if (!/^\d+$/.test(valores.monto) || Number(valores.monto) < 1) { setError('El monto debe ser mayor que $0.'); return; }
    pendienteRef.current = true;
    setGuardando(true);
    setError('');
    try {
      await api.post('finanzas/movimientos/', { ...valores, descripcion: valores.descripcion.trim() });
      alGuardar();
    } catch (err) {
      const datos = err.response?.data;
      setError(err.response?.status === 400 ? Object.values(datos || {}).flat().join(' ') : 'No se pudo guardar el movimiento. Revisa tu conexión e inténtalo nuevamente.');
    } finally { pendienteRef.current = false; setGuardando(false); }
  }
  return <form className="insights-movement-form" onSubmit={guardar} aria-label="Registrar movimiento financiero">
    <div className="insights-form-heading"><div><h3>Registrar ingreso o gasto</h3><p>Anota un cobro o pago realizado. No modifica el estado de los vehículos.</p></div><button type="button" className="insights-icon-button" onClick={alCerrar} disabled={guardando} aria-label="Cerrar formulario"><X size={19}/></button></div>
    <fieldset disabled={guardando}><label className="movement-description">Descripción<input ref={descripcionRef} name="descripcion" value={valores.descripcion} onChange={actualizar} maxLength={200} required placeholder="Ej. Venta de vehículo o reparación de motor"/></label><label>Tipo<select name="tipo" value={valores.tipo} onChange={actualizar}><option value="ingreso">Ingreso</option><option value="gasto">Gasto</option></select></label><label>Monto (CLP)<span className="movement-money"><NumeroVehiculo name="monto" value={valores.monto} onChange={actualizar} moneda required aria-label="Monto en pesos chilenos"/></span></label><label>Fecha<input type="date" name="fecha" value={valores.fecha} max={hoyChile()} onChange={actualizar} required/></label></fieldset>
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
  const total = inventario ? inventario.disponible + inventario.reservado + inventario.vendido : 0;
  const disponible = total ? inventario.disponible / total * 100 : 0;
  const reservado = total ? inventario.reservado / total * 100 : 0;

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
    <div className="insights-heading"><div><span className="section-kicker">VISIÓN DEL NEGOCIO</span><h2 id="business-title">Tu automotora en cifras</h2><p>Un vistazo al inventario y a tus movimientos financieros.</p></div><div className="insights-controls"><label><span className="insights-sr-only">Período financiero</span><select value={meses} onChange={event => { setMeses(event.target.value); setPagina(1); setEliminar(null); }}><option value="3">Últimos 3 meses</option><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option></select></label><button className="insights-icon-button" aria-label="Actualizar indicadores" disabled={cargando} onClick={() => setRevision(valor => valor + 1)}><RefreshCw size={18}/></button><button ref={registrarRef} className="button-primary" onClick={() => { setMostrarFormulario(valor => !valor); setAviso(''); }} aria-expanded={mostrarFormulario} aria-controls="movement-form"><Plus size={17}/>Registrar movimiento</button></div></div>
    {aviso && <p className="insights-notice" role="status">{aviso}</p>}
    {mostrarFormulario && <div id="movement-form"><FormularioMovimiento alCerrar={cerrarFormulario} alGuardar={() => { cerrarFormulario(); setPagina(1); setAviso('Movimiento guardado. El resumen se actualizará con los datos del período seleccionado.'); setRevision(valor => valor + 1); }}/></div>}
    <div aria-busy={cargando}>{cargando ? <div className="insights-loading" role="status">Cargando indicadores del negocio…</div> : resultado.error ? <div className="insights-loading"><p className="insights-error" role="alert">{resultado.error}</p><button className="button-secondary" onClick={() => setRevision(valor => valor + 1)}>Reintentar</button></div> : datos && <>
      <div className="insights-metrics">{[
        { etiqueta: 'Vehículos en stock', valor: datos.stock, nota: `${inventario.disponible} disponibles · ${inventario.reservado} reservados`, Icono: CarFront, clase: 'stock' },
        { etiqueta: 'Vehículos vendidos', valor: inventario.vendido, nota: 'Acumulado · estado actual del inventario', Icono: CircleCheck, clase: 'sold' },
        { etiqueta: 'Ingresos registrados', valor: pesos.format(datos.ingresos), nota: 'Cobros anotados en el período', Icono: ArrowDownLeft, clase: 'income' },
        { etiqueta: 'Gastos registrados', valor: pesos.format(datos.gastos), nota: 'Pagos anotados en el período', Icono: ArrowUpRight, clase: 'expense' },
      ].map(({ etiqueta, valor, nota, Icono, clase }) => <article className={`insights-metric metric-${clase}`} key={etiqueta}><div><h3>{etiqueta}</h3><span className="insights-metric-icon"><Icono size={19}/></span></div><strong>{valor}</strong><p>{nota}</p></article>)}</div>
      <div className="insights-chart-grid"><section className="insights-panel"><div className="insights-panel-heading"><div><h3>Ingresos y gastos</h3><p>{fechaCorta(datos.desde)} al {fechaCorta(datos.hasta)} · CLP</p></div><span className="insights-pill">Mensual</span></div><GraficoFlujo serie={datos.serie}/><div className="insights-balance"><span>Saldo de movimientos del período<small>Ingresos menos gastos registrados</small></span><strong className={datos.saldo < 0 ? 'negative-amount' : ''}>{pesos.format(datos.saldo)}</strong></div></section>
      <section className="insights-panel inventory-summary"><div className="insights-panel-heading"><div><h3>Estado del inventario</h3><p>Distribución actual de tus vehículos</p></div></div><div className="inventory-donut" role="img" aria-label={`${inventario.disponible} disponibles, ${inventario.reservado} reservados y ${inventario.vendido} vendidos`} style={{ background: total ? `conic-gradient(#16776b 0% ${disponible}%, #d7a45e ${disponible}% ${disponible + reservado}%, #8a9da7 ${disponible + reservado}% 100%)` : '#e8eeeb' }}><div><strong>{total}</strong><span>vehículos</span></div></div><ul className="inventory-legend">{[['disponible', 'Disponibles', 'income-dot'], ['reservado', 'Reservados', 'expense-dot'], ['vendido', 'Vendidos', 'sold-dot']].map(([estado, etiqueta, clase]) => <li key={estado}><span><i className={clase}/>{etiqueta}</span><strong>{inventario[estado]}</strong></li>)}</ul><div className="inventory-investment"><span>Inversión registrada en stock</span><strong>{pesos.format(datos.inversion_stock)}</strong><small>Precios de compra de disponibles y reservados</small></div></section></div>
      {datos.ultimos_movimientos.length > 0 && <section className="insights-panel recent-movements"><div className="insights-panel-heading"><div><h3>Movimientos del período</h3><p>{datos.cantidad_movimientos} movimientos · Del más reciente al más antiguo</p></div></div>
        {eliminar && <div className="movement-delete-confirm" role="group" aria-label="Confirmar eliminación de movimiento"><p>¿Eliminar «{eliminar.descripcion}» por {pesos.format(Number(eliminar.monto))}?</p><small>Dejará de contarse en los ingresos, gastos y gráficos.{eliminar.automatico ? ' El vehículo seguirá vendido. Este ingreso no se volverá a generar al editar sus datos.' : ''}</small><div><button type="button" className="button-secondary" disabled={eliminando} onClick={() => { setEliminar(null); setErrorEliminar(''); }}>Cancelar</button><button type="button" className="button-secondary movement-delete-button" disabled={eliminando} onClick={eliminarMovimiento}>{eliminando ? 'Eliminando…' : 'Sí, eliminar movimiento'}</button></div>{errorEliminar && <p className="insights-error" role="alert">{errorEliminar}</p>}</div>}
        <div className="insights-table-scroll"><table><thead><tr><th>Descripción</th><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Acciones</th></tr></thead><tbody>{datos.ultimos_movimientos.map(movimiento => <tr key={movimiento.id}><td>{movimiento.descripcion}{movimiento.automatico && <small className="automatic-sale-label">Venta automática</small>}</td><td>{fechaCorta(movimiento.fecha)}</td><td><span className={`movement-badge ${movimiento.tipo}`}>{movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span></td><td>{pesos.format(Number(movimiento.monto))}</td><td><button type="button" className="insights-icon-button movement-delete-button" aria-label={`Eliminar ${movimiento.descripcion}`} disabled={eliminando} onClick={() => { setEliminar(movimiento); setErrorEliminar(''); }}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>
        {datos.paginas > 1 && <nav className="movement-pagination" aria-label="Páginas de movimientos"><button className="button-secondary" disabled={datos.pagina <= 1 || eliminando} onClick={() => { setEliminar(null); setPagina(datos.pagina - 1); }}>Anterior</button><span>Página {datos.pagina} de {datos.paginas}</span><button className="button-secondary" disabled={datos.pagina >= datos.paginas || eliminando} onClick={() => { setEliminar(null); setPagina(datos.pagina + 1); }}>Siguiente</button></nav>}
      </section>}
      <div className="insights-footnote"><span>{datos.clientes} clientes registrados · Actualizado {new Date(datos.actualizado).toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit' })}</span><p>El período aplica a ingresos y gastos. Marcar un vehículo como vendido registra automáticamente un ingreso por su precio de venta. Los otros cobros y pagos se anotan manualmente; evita registrar dos veces una misma venta.</p></div>
    </>}</div>
  </section>;
}
