import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppHeader from './AppHeader';
import api from '../api';
import './DetalleVehiculo.css';

const moneda = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const precio = valor => valor === null || valor === undefined ? 'Sin información' : moneda.format(Number(valor));
const fecha = valor => valor ? new Date(valor).toLocaleString('es-CL', { timeZone: 'America/Santiago' }) : 'Sin consulta guardada';

export default function DetalleVehiculo() {
  const { id } = useParams();
  return <FichaVehiculo key={id} id={id} />;
}

function FichaVehiculo({ id }) {
  const [vehiculo, setVehiculo] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [revision, setRevision] = useState(0);
  const [ocupado, setOcupado] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [gastos, setGastos] = useState('');
  const consultaRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    api.get(`vehiculos/${id}/`, { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setVehiculo(data);
    }).catch(error => {
      if (!controller.signal.aborted) setErrorCarga(error.response?.status === 404 ? 'El vehículo no existe.' : 'No se pudo cargar el vehículo. Revisa tu conexión y sesión.');
    });
    return () => { controller.abort(); consultaRef.current?.abort(); };
  }, [id, revision]);

  async function consultar(tipo) {
    if (ocupado || consultaRef.current) return;
    const controller = new AbortController();
    consultaRef.current = controller;
    setOcupado(tipo);
    setMensaje(null);
    try {
      const { data } = await api.post(`vehiculos/${id}/consultas/${tipo}/`, {}, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setVehiculo(data);
      setMensaje({ tipo: 'success', texto: 'Consulta actualizada y guardada.' });
    } catch (error) {
      if (!controller.signal.aborted) setMensaje({ tipo: 'error', texto: error.response?.data?.detail || 'No se pudo completar la consulta. Puedes reintentar; la información anterior se conserva.' });
    } finally {
      consultaRef.current = null;
      if (!controller.signal.aborted) setOcupado('');
    }
  }

  const tasacion = vehiculo?.tasacion;
  const valores = tasacion?.datos;
  const referencia = valores?.referencia;
  const diferencia = referencia == null ? null : Number(vehiculo.precio_venta) - referencia;
  const gastosValidos = gastos === '' || (/^\d+$/.test(gastos) && Number.isSafeInteger(Number(gastos)));
  const margen = vehiculo && gastosValidos ? Number(vehiculo.precio_venta) - Number(vehiculo.precio_compra) - Number(gastos || 0) : null;
  const recalls = vehiculo?.recalls;
  const boton = (tipo, texto) => <button type="button" className="button-secondary" disabled={Boolean(ocupado)} onClick={() => consultar(tipo)}>{ocupado === tipo ? 'Consultando…' : texto}</button>;

  return <div className="vehicles-page"><AppHeader/><main className="workspace vehicle-file">
    <div className="breadcrumb"><Link to="/vehiculos">Vehículos</Link><span>/</span><strong>Detalle del vehículo</strong></div>
    {!vehiculo ? errorCarga ? <div className="directory-message"><p role="alert">{errorCarga}</p><button className="button-secondary" onClick={() => { setErrorCarga(''); setRevision(value => value + 1); }}>Reintentar</button></div> : <p role="status">Cargando vehículo…</p> : <>
      <section className="dashboard-welcome"><div><div className="section-kicker">{vehiculo.patente}</div><h1>{vehiculo.marca} {vehiculo.modelo}</h1><p>{vehiculo.anio} · {vehiculo.color} · {vehiculo.estado}</p></div><Link className="button-primary" to={`/vehiculos/${id}/editar`}>Editar vehículo</Link></section>
      <div aria-live="polite">{mensaje && <p className={`feedback ${mensaje.tipo}`} role={mensaje.tipo === 'error' ? 'alert' : 'status'}>{mensaje.texto}</p>}</div>
      <section className="vehicle-file-panel" aria-busy={ocupado === 'ficha'}><div className="vehicle-file-heading"><h2>Ficha técnica ampliada</h2>{boton('ficha', 'Actualizar ficha por patente')}</div>
        <dl className="vehicle-file-data">{[['VIN / chasis', vehiculo.vin], ['Número de motor', vehiculo.numero_motor], ['Versión', vehiculo.version], ['Cilindrada / motor (según proveedor)', vehiculo.cilindrada], ['Puertas', vehiculo.puertas], ['Kilometraje registrado', `${Number(vehiculo.kilometraje).toLocaleString('es-CL')} km`], ['Combustible', vehiculo.combustible], ['Transmisión', vehiculo.transmision]].map(([etiqueta, valor]) => <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor || 'Sin información'}</dd></div>)}</dl>
        <p className="vehicle-file-note">Última actualización de ficha por GetAPI: {fecha(vehiculo.ficha_consultada)}. Puedes corregir los datos desde Editar vehículo.</p>
        {vehiculo.descripcion && <p>{vehiculo.descripcion}</p>}
      </section>
      <section className="vehicle-file-panel" aria-busy={ocupado === 'tasacion'}><div className="vehicle-file-heading"><h2>Tasación y comparación de precios</h2>{boton('tasacion', tasacion ? 'Actualizar tasación' : 'Consultar tasación')}</div>
        <dl className="vehicle-file-data"><div><dt>Precio de compra registrado</dt><dd>{precio(vehiculo.precio_compra)}</dd></div><div><dt>Precio de venta registrado</dt><dd>{precio(vehiculo.precio_venta)}</dd></div></dl>
        {valores ? <><dl className="vehicle-file-data"><div><dt>Precio usado de referencia</dt><dd>{precio(referencia)}</dd></div><div><dt>Rango estimado</dt><dd>{precio(valores.minimo)} — {precio(valores.maximo)}</dd></div><div><dt>Valor de retoma</dt><dd>{precio(valores.retoma)}</dd></div><div><dt>Tasación fiscal {valores.anio_fiscal || ''}</dt><dd>{precio(valores.fiscal)}</dd></div><div><dt>Venta frente a referencia</dt><dd>{diferencia === null ? 'Sin referencia disponible' : diferencia === 0 ? 'Igual a la referencia' : `${precio(Math.abs(diferencia))} ${diferencia > 0 ? 'sobre' : 'bajo'} la referencia${referencia > 0 ? ` (${(Math.abs(diferencia) / referencia * 100).toFixed(1)} %)` : ''}`}</dd></div></dl><p className="vehicle-file-note">{tasacion.fuente} · Consultado: {fecha(tasacion.consultado)}</p></> : <p>Aún no has consultado una tasación para este vehículo.</p>}
        <div className="vehicle-margin"><label htmlFor="gastos-estimados">Gastos estimados adicionales (CLP)<input id="gastos-estimados" type="number" min="0" step="1" value={gastos} onChange={event => setGastos(event.target.value)}/></label><p role="status">{gastosValidos ? <>Margen previsto: <strong>{precio(margen)}</strong></> : 'Ingresa gastos enteros iguales o mayores que cero.'}</p></div>
        <p className="vehicle-file-note">Margen = venta − compra − gastos estimados. Esta simulación no guarda gastos ni reemplaza el registro financiero. La tasación es orientativa y no modifica tus precios.</p>
      </section>
      <section className="vehicle-file-panel" aria-busy={ocupado === 'recalls'}><div className="vehicle-file-heading"><h2>Campañas de seguridad (recall)</h2>{vehiculo.vin ? boton('recalls', recalls ? 'Actualizar campañas' : 'Consultar campañas por VIN') : <span>Completa el VIN en la ficha o al editar el vehículo.</span>}</div>
        {recalls ? <>{recalls.campanias.length ? <ul className="vehicle-recalls">{recalls.campanias.map((campania, index) => <li key={`${campania.codigo}-${index}`}><h3>{campania.codigo || 'Campaña de seguridad'} · {campania.marca} {campania.modelo}</h3><p>Período de venta: {campania.periodo || 'Sin información'}</p><div>{campania.detalle && <a href={campania.detalle} target="_blank" rel="noopener noreferrer">Ver campaña</a>}{campania.pdf && <a href={campania.pdf} target="_blank" rel="noopener noreferrer">Ver documento PDF</a>}</div></li>)}</ul> : <p>No se encontraron campañas en la respuesta del proveedor.</p>}<p className="vehicle-file-note">VIN consultado: {recalls.vin} · {recalls.fuente} · {fecha(recalls.consultado)}</p></> : <p>Aún no hay una consulta de campañas guardada.</p>}
        <p className="vehicle-file-note">La ausencia de resultados no certifica que el vehículo esté libre de campañas o reparaciones pendientes. Verifica la información con la marca.</p>
      </section>
    </>}
  </main></div>;
}
