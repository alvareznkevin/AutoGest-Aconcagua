import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Sparkles, ArrowLeft, CarFront, Search, CircleCheck, ClipboardList } from 'lucide-react';
import AppHeader from './AppHeader';
import api from '../api';
import { mensajeErrorRecomendaciones } from './errorRecomendaciones';
import './RecomendacionesCliente.css';

const pesos = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
export default function RecomendacionesCliente() {
  const { id } = useParams();
  return <FormularioRecomendaciones key={id} id={id}/>;
}
function FormularioRecomendaciones({ id }) {
  const [cliente, setCliente] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [revision, setRevision] = useState(0);
  const [criterios, setCriterios] = useState({ preferencias: '', presupuesto_maximo: '', transmision: '', tipo: '' });
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const pendiente = useRef(false);
  const solicitud = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    api.get(`clientes/${id}/`, { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setCliente(data);
      setCriterios(prev => ({ ...prev, preferencias: data.preferencia || '' }));
    }).catch(err => { if (!controller.signal.aborted) setErrorCarga(err.response?.status === 404 ? 'El cliente ya no existe.' : 'No se pudo cargar el cliente. Verifica tu sesión y vuelve a intentarlo.'); });
    return () => { controller.abort(); solicitud.current?.abort(); };
  }, [id, revision]);
  const actualizar = event => {
    setCriterios(prev => ({ ...prev, [event.target.name]: event.target.value }));
    setResultado(null); setError('');
  };
  async function generar(event) {
    event.preventDefault();
    if (pendiente.current || !consentimiento) return;
    pendiente.current = true; setGenerando(true); setError(''); setResultado(null);
    const controller = new AbortController(); solicitud.current = controller;
    try {
      const { data } = await api.post(`clientes/${id}/recomendaciones/`, {
        ...criterios, presupuesto_maximo: criterios.presupuesto_maximo ? Number(criterios.presupuesto_maximo) : null,
      }, { signal: controller.signal, timeout: 45000 });
      if (!controller.signal.aborted) setResultado(data);
    } catch (err) {
      if (!controller.signal.aborted) setError(mensajeErrorRecomendaciones(err));
    } finally {
      pendiente.current = false;
      if (!controller.signal.aborted) setGenerando(false);
    }
  }
  return <div className="clientes-page"><AppHeader/><main className="workspace recommendation-page">
    <Link to="/clientes" className="recommendation-back"><ArrowLeft size={16}/>Volver a clientes</Link>
    <section className="dashboard-welcome"><div><span className="section-kicker">ASESOR COMERCIAL</span><h1>Encuentra su próximo vehículo</h1><p>{cliente ? `Recomendaciones para ${cliente.nombre}` : 'Preferencias del cliente e inventario, en una sola búsqueda.'}</p></div><Sparkles size={36}/></section>
    {errorCarga ? <div role="alert" className="delete-error">{errorCarga}<button className="button-secondary" onClick={() => { setErrorCarga(''); setRevision(v => v + 1); }}>Reintentar</button></div> : !cliente ? <p role="status">Cargando cliente…</p> : <>
      <form className="recommendation-form" onSubmit={generar}><h2>Define la búsqueda</h2><p>Revisa las preferencias y completa las condiciones obligatorias. Estos cambios se usan solo para esta consulta.</p>
        <fieldset disabled={generando}><label className="recommendation-wide">Preferencias<textarea name="preferencias" value={criterios.preferencias} onChange={actualizar} required maxLength={1000} rows={3}/></label>
        <label>Presupuesto máximo del cliente (CLP)<input name="presupuesto_maximo" type="number" min="1" max="999999999999" step="1" placeholder="Sin límite definido" value={criterios.presupuesto_maximo} onChange={actualizar}/></label>
        <label>Transmisión<select name="transmision" value={criterios.transmision} onChange={actualizar}><option value="">Sin restricción</option><option value="manual">Manual</option><option value="automatica">Automática</option></select></label>
        <label>Tipo<select name="tipo" value={criterios.tipo} onChange={actualizar}><option value="">Sin restricción</option><option value="automovil">Automóvil</option><option value="camioneta">Camioneta</option><option value="camion">Camión</option></select></label>
        <label className="recommendation-wide recommendation-consent"><input type="checkbox" checked={consentimiento} onChange={e => setConsentimiento(e.target.checked)} required/>Consultar con IA enviando estas preferencias y datos de vehículos a Groq. No incluyas información personal en las preferencias; el sistema no envía nombre, correo ni teléfono.</label>
        <button className="button-primary" type="submit" disabled={!consentimiento}><Sparkles size={17}/>{generando ? 'Evaluando ambas opciones…' : 'Generar recomendaciones'}</button></fieldset>
        {generando && <p role="status">Comparando el inventario y preparando modelos externos para cotizar. Una sola consulta evalúa ambas opciones; no es necesario volver a presionar.</p>}{error && <p role="alert" className="delete-error">{error}</p>}
      </form>
      {resultado && <div aria-live="polite"><p className="delete-success" role="status">Consulta completada: {resultado.inventario.length} opciones del inventario y {resultado.externos.length} modelos externos.</p><p className="recommendation-notice">{resultado.aviso}</p><p className="recommendation-count">{resultado.candidatos_evaluados} candidatos del inventario evaluados de {resultado.total_candidatos} compatibles con los filtros. Solo vehículos disponibles con precio de venta mayor que cero.{resultado.total_candidatos > resultado.candidatos_evaluados && ' Se priorizaron hasta 15 candidatos por coincidencia con tus preferencias; precio y año resuelven empates.'}</p>
      <section className="recommendation-section inventory-recommendations"><div className="recommendation-section-heading"><h2><CarFront size={23}/>Disponibles en tu inventario</h2><span className="recommendation-total">{resultado.inventario.length} opciones</span></div><p>Datos comerciales obtenidos de tu base de datos. Confirma su disponibilidad antes de ofrecerlos.</p><div className="recommendation-grid">{resultado.inventario.map(v => <article className="recommendation-card" key={v.id}><span className="recommendation-badge">EN INVENTARIO</span><h3>{v.marca} {v.modelo}</h3><span>{v.anio} · {v.transmision} · {v.patente}</span><strong className="recommendation-price">{pesos.format(v.precio_venta)}</strong><div className="recommendation-match"><h4><CircleCheck size={16} aria-hidden="true"/>Por qué encaja</h4><p>{v.motivo}</p></div><Link className="button-secondary" to={`/vehiculos/${v.id}`}>Ver vehículo</Link></article>)}</div>{!resultado.inventario.length && <div className="recommendation-empty">{resultado.explicacion_inventario || 'No se encontraron coincidencias recomendables en el inventario para estos criterios.'}</div>}</section>
      <section className="recommendation-section external-recommendations"><div className="recommendation-section-heading"><h2><Search size={23}/>Modelos externos para cotizar</h2><span className="recommendation-total">{resultado.externos.length} sugerencias</span></div><p>Opciones para que la automotora busque, evalúe su compra y cotice la reventa al cliente. Estas sugerencias no realizan una búsqueda de anuncios en internet ni verifican disponibilidad.</p><div className="recommendation-grid">{resultado.externos.map((v, i) => <article className="recommendation-card external" key={i}><span className="recommendation-badge">POR BUSCAR Y COTIZAR</span><h3>{v.marca} {v.modelo}</h3><div className="recommendation-pending-price"><span>Precio de adquisición</span><strong>Por cotizar</strong></div><div className="recommendation-match"><h4><Sparkles size={16} aria-hidden="true"/>Por qué evaluarlo</h4><p>{v.motivo}</p></div><h4 className="recommendation-checklist-title"><ClipboardList size={16} aria-hidden="true"/>Antes de adquirir</h4><ul>{v.verificar.map((texto, j) => <li key={j}>{texto}</li>)}</ul><small>Sin precio confirmado. Verifica versión, presupuesto y margen de reventa.</small></article>)}</div>{!resultado.externos.length && <div className="recommendation-empty">{resultado.explicacion_externos || 'No se propusieron modelos externos para estos criterios.'}</div>}</section></div>}
    </>}
  </main></div>;
}
