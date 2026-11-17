import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Banknote, X, Plus, RefreshCw } from 'lucide-react';
import api from '../api';
import NumeroVehiculo from './NumeroVehiculo';
import './RegistrarVenta.css';

const moneda = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const hoy = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' }).format(new Date());
export default function RegistrarVenta({ vehiculo, onCerrar, onGuardada }) {
  const dialogo = useRef(null);
  const titulo = useId();
  const [datos, setDatos] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [revision, setRevision] = useState(0);
  const [errorCarga, setErrorCarga] = useState('');
  const [error, setError] = useState('');
  const [cliente, setCliente] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [precio, setPrecio] = useState(String(vehiculo.precio_venta));
  const [confirmarPerdida, setConfirmarPerdida] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [gasto, setGasto] = useState({ monto: '0', descripcion: '' });
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [errorGasto, setErrorGasto] = useState('');
  const pendiente = useRef(false);
  const ocupado = guardando || guardandoGasto;
  const ganancia = datos ? Number(precio || 0) - Number(datos.precio_compra) - Number(datos.gastos) : 0;
  useEffect(() => {
    const modal = dialogo.current; modal.showModal();
    const anterior = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { modal.close(); document.body.style.overflow = anterior; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      try {
        const [resumen, personas] = await Promise.all([
          api.get(`finanzas/vehiculos/${vehiculo.id}/venta/`, { signal: controller.signal }),
          (async () => {
            let url = 'clientes/'; const filas = [];
            while (url) { const { data } = await api.get(url, { signal: controller.signal }); filas.push(...(Array.isArray(data) ? data : data.results)); url = Array.isArray(data) ? null : data.next; }
            return filas;
          })(),
        ]);
        if (!controller.signal.aborted) { setDatos(resumen.data); setClientes(personas); }
      } catch (err) { if (!controller.signal.aborted) setErrorCarga(err.response?.data?.detail || 'No se pudo cargar el resumen. Se requiere acceso de administrador.'); }
      finally { if (!controller.signal.aborted) setCargando(false); }
    }
    cargar(); return () => controller.abort();
  }, [vehiculo.id, revision]);
  function actualizarResumen() { setCargando(true); setErrorCarga(''); setError(''); setRevision(v => v + 1); }
  function mensaje(err) {
    const data = err.response?.data;
    if (typeof data?.detail === 'string') return data.detail;
    if (data && typeof data === 'object') return Object.values(data).flat().filter(v => typeof v === 'string').join(' ') || 'Revisa los campos ingresados.';
    return 'No se recibió confirmación del servidor. Actualiza el inventario antes de reintentar para comprobar si la venta quedó registrada.';
  }
  async function registrarGasto() {
    if (pendiente.current) return;
    if (!gasto.descripcion.trim() || !/^\d+$/.test(gasto.monto) || Number(gasto.monto) <= 0) { setErrorGasto('Ingresa una descripción y un monto entero mayor que cero.'); return; }
    pendiente.current = true; setGuardandoGasto(true); setErrorGasto('');
    try {
      await api.post('finanzas/movimientos/', { ...gasto, descripcion: gasto.descripcion.trim(), tipo: 'gasto', fecha: hoy(), vehiculo: vehiculo.id });
      setGasto({ monto: '0', descripcion: '' }); actualizarResumen();
    } catch (err) { setErrorGasto(mensaje(err)); }
    finally { pendiente.current = false; setGuardandoGasto(false); }
  }
  async function guardar(event) {
    event.preventDefault();
    if (pendiente.current || !datos || cargando) return;
    pendiente.current = true; setGuardando(true); setError('');
    try {
      const { data } = await api.post(`finanzas/vehiculos/${vehiculo.id}/venta/`, { cliente: Number(cliente), fecha, precio_venta: precio, precio_compra_confirmado: datos.precio_compra, gastos_confirmados: datos.gastos, confirmar_perdida: confirmarPerdida });
      onGuardada(data);
    } catch (err) { setError(mensaje(err)); }
    finally { pendiente.current = false; setGuardando(false); }
  }
  return createPortal(<dialog ref={dialogo} className="sale-dialog" aria-labelledby={titulo} onCancel={event => { event.preventDefault(); if (!ocupado) onCerrar(); }}>
    <button type="button" className="delete-dialog-close" aria-label="Cerrar registro de venta" disabled={ocupado} onClick={onCerrar}><X size={20}/></button>
    <div className="sale-heading"><span><Banknote size={24}/></span><div><small>CIERRE COMERCIAL</small><h2 id={titulo}>Registrar venta</h2><p>{vehiculo.marca} {vehiculo.modelo} · {vehiculo.patente}</p></div></div>
    {cargando ? <p role="status">Cargando costos y compradores…</p> : errorCarga ? <div role="alert"><p className="delete-error">{errorCarga}</p><button type="button" className="button-secondary" onClick={actualizarResumen}>Reintentar</button></div> : datos?.venta || datos?.vehiculo.estado === 'vendido' ? <p className="delete-error" role="alert">Este vehículo ya está vendido. No puedes registrar otra venta.</p> : datos && <form onSubmit={guardar}>
      <fieldset disabled={ocupado} className="sale-fields"><label>Cliente comprador<select value={cliente} onChange={e => setCliente(e.target.value)} required><option value="">Selecciona un cliente</option>{clientes.map(c => <option value={c.id} key={c.id}>{c.nombre} · {c.correo}</option>)}</select></label><label>Fecha de venta<input type="date" value={fecha} max={hoy()} onChange={e => setFecha(e.target.value)} required/></label><label>Precio real de venta (CLP)<span className="sale-money"><NumeroVehiculo name="precio_venta" value={precio} onChange={e => { setPrecio(e.target.value); setConfirmarPerdida(false); }} moneda required/></span></label></fieldset>
      {!clientes.length && <p className="sale-help">Primero debes <Link to="/clientes/registrar">registrar un cliente comprador</Link>.</p>}
      <section className="sale-expenses"><div className="sale-section-heading"><h3>Gastos asociados al vehículo</h3><button type="button" className="sale-refresh" disabled={ocupado} onClick={actualizarResumen}><RefreshCw size={14}/>Actualizar costos</button></div>
        {datos.gastos_detalle.length ? <ul>{datos.gastos_detalle.map(g => <li key={g.id}><span>{g.descripcion}</span><strong>{moneda.format(Number(g.monto))}</strong></li>)}</ul> : <p className="sale-help">Sin gastos vinculados. Los gastos generales sin vehículo no se incluyen en esta ganancia.</p>}
        <details><summary><Plus size={15}/>Registrar gasto de este vehículo</summary><div className="sale-expense-inputs"><label>Descripción<input disabled={ocupado} value={gasto.descripcion} maxLength={200} onChange={e => setGasto(v => ({ ...v, descripcion: e.target.value }))} placeholder="Ej. Reparación o transferencia"/></label><label>Monto (CLP)<span className="sale-money"><NumeroVehiculo disabled={ocupado} name="monto" value={gasto.monto} onChange={e => setGasto(v => ({ ...v, monto: e.target.value }))} moneda/></span></label><button type="button" className="button-secondary" disabled={ocupado} onClick={registrarGasto}>{guardandoGasto ? 'Guardando…' : 'Guardar gasto'}</button></div><p className="sale-help">El gasto se guarda de inmediato, aunque después canceles la venta. No vuelvas a incluir el precio de compra.</p>{errorGasto && <p className="delete-error" role="alert">{errorGasto}</p>}</details>
      </section>
      <section className="sale-calculation" aria-label="Cálculo de ganancia"><div><span>Precio real de venta</span><strong>{moneda.format(Number(precio || 0))}</strong></div><div><span>Menos precio de compra</span><strong>− {moneda.format(Number(datos.precio_compra))}</strong></div><div><span>Menos gastos vinculados</span><strong>− {moneda.format(Number(datos.gastos))}</strong></div><div className={ganancia < 0 ? 'sale-profit negative' : 'sale-profit'}><span>{ganancia < 0 ? 'Pérdida de la venta' : 'Ganancia de la venta'}</span><strong>{moneda.format(ganancia)}</strong></div></section>
      {ganancia < 0 && <label className="sale-loss-confirm"><input type="checkbox" disabled={ocupado} checked={confirmarPerdida} onChange={e => setConfirmarPerdida(e.target.checked)} required/>Confirmo que deseo registrar esta venta con pérdida.</label>}
      <p className="sale-help">Se marcará como vendido y se registrará un único ingreso. La ganancia considera compra y gastos vinculados; no representa utilidad neta del negocio.</p>
      {error && <p className="delete-error" role="alert">{error}</p>}
      <div className="sale-actions"><button type="button" className="button-secondary" disabled={ocupado} onClick={onCerrar}>Cancelar</button><button type="submit" className="button-primary" disabled={ocupado || !clientes.length || (ganancia < 0 && !confirmarPerdida)}>{guardando ? 'Registrando venta…' : 'Confirmar venta'}</button></div>
    </form>}
  </dialog>, document.body);
}
