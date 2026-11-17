import ConfirmarEliminacion from './ConfirmarEliminacion';
import FiltrosPlegables from './FiltrosPlegables';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserRoundPlus, Pencil, Search, Sparkles, Trash2 } from 'lucide-react';
import AppHeader from './AppHeader';
import api from '../api';
import './ListaVehiculos.css';
import './ListaClientes.css';
import './AccionesRegistro.css';

const filtrosIniciales = { nombre: '', correo: '', telefono: '', preferencia: '' };
function normalizar(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function PreferenciasCliente({ texto, nombre }) {
  const preferencias = String(texto || '').trim();
  if (!preferencias) return <span className="client-preference-empty">Sin preferencias registradas</span>;
  if (preferencias.length <= 110) return <p className="client-preference-text">{preferencias}</p>;
  return <details className="client-preference-details">
    <summary aria-label={`Ver preferencias completas de ${nombre}`}><span className="client-preference-preview">{preferencias}</span><span className="client-preference-toggle">Ver preferencias completas</span></summary>
    <p className="client-preference-text">{preferencias}</p>
  </details>;
}

export default function ListaClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({ ...filtrosIniciales });

  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [avisoEliminar, setAvisoEliminar] = useState('');
  const eliminacionPendiente = useRef(false);
  const [registroAEliminar, setRegistroAEliminar] = useState(null);

  async function eliminarRegistro(registro) {
    if (eliminacionPendiente.current) return;
    eliminacionPendiente.current = true;
    setEliminandoId(registro.id);
    setErrorEliminar('');
    setAvisoEliminar('');
    try {
      await api.delete(`clientes/${registro.id}/`);
      setClientes(actuales => actuales.filter(item => item.id !== registro.id));
      setAvisoEliminar('Registro eliminado correctamente.');
      setRegistroAEliminar(null);
    } catch (error) {
      setErrorEliminar(error.response?.data?.detail || 'No fue posible eliminar el registro. Inténtalo nuevamente.');
    } finally {
      eliminacionPendiente.current = false;
      setEliminandoId(null);
    }
  }

  function limpiarFiltros() { setBusqueda(''); setFiltros({ ...filtrosIniciales }); }
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  const visibles = clientes.filter(cliente => palabras.every(palabra => normalizar([cliente.nombre, cliente.correo, cliente.telefono, cliente.preferencia].join(' ')).includes(palabra)) && Object.entries(filtros).every(([campo, valor]) => normalizar(cliente[campo]).includes(normalizar(valor))));
  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      try {
        let url = 'clientes/';
        const rows = [];
        while (url) {
          const { data } = await api.get(url, { signal: controller.signal });
          rows.push(...(Array.isArray(data) ? data : data.results));
          url = Array.isArray(data) ? null : data.next;
        }
        if (!controller.signal.aborted) setClientes(rows);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.response?.status === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión para ver los clientes.' : err.response?.status === 403 ? 'Necesitas permisos de administrador para consultar los clientes.' : 'No se pudieron cargar los clientes. Comprueba la conexión e inténtalo nuevamente.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    cargar();
    return () => controller.abort();
  }, [revision]);
  function reintentar() { setLoading(true); setError(''); setRevision(value => value + 1); }
  return <div className="clientes-page">
    <AppHeader />
    {registroAEliminar && <ConfirmarEliminacion nombre={registroAEliminar.nombre} tipo="cliente" pendiente={eliminandoId !== null} error={errorEliminar} onCancelar={() => { if (eliminandoId === null) { setRegistroAEliminar(null); setErrorEliminar(''); } } } onConfirmar={() => eliminarRegistro(registroAEliminar)}/>}
    <main className="workspace">
        {errorEliminar && !registroAEliminar && <p className="delete-error" role="alert">{errorEliminar}</p>}
        {avisoEliminar && <p className="delete-success" role="status">{avisoEliminar}</p>}
      <div className="section-kicker">GESTIÓN COMERCIAL</div>
      <section className="dashboard-welcome"><div><h1>Clientes registrados</h1><p>Datos de contacto y preferencias de búsqueda de tus clientes.</p></div><Link className="button-primary" to="/clientes/registrar"><UserRoundPlus size={18}/>Registrar cliente</Link></section>
      <section className="client-directory" aria-label="Listado de clientes" aria-busy={loading}>
        {loading ? <p role="status" className="directory-message">Cargando clientes…</p> : error ? <div className="directory-message"><p role="alert">{error}</p><button className="button-secondary" onClick={reintentar}>Reintentar</button><Link to="/login">Ir al inicio de sesión</Link></div> : clientes.length === 0 ? <div className="directory-message"><Users size={32}/><h2>Aún no hay clientes registrados</h2><p>Registra el primer cliente para ver aquí sus datos.</p></div> : <><p className="directory-count">{clientes.length} {clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}</p><div className="vehicle-toolbar"><label className="vehicle-search"><Search size={18}/><span className="vehicle-sr-only">Buscar clientes</span><input type="search" placeholder="Nombre, correo, teléfono o preferencias" value={busqueda} onChange={event => setBusqueda(event.target.value)}/></label></div><FiltrosPlegables cantidad={Object.values(filtros).filter(v => String(v).trim()).length}><div className="vehicle-filters client-filters">{[['nombre', 'Nombre'], ['correo', 'Correo electrónico'], ['telefono', 'Teléfono'], ['preferencia', 'Preferencias de búsqueda']].map(([campo, etiqueta]) => <label key={campo}>{etiqueta}<input type="search" name={campo} value={filtros[campo]} onChange={event => setFiltros(previous => ({ ...previous, [campo]: event.target.value }))}/></label>)}<button className="button-secondary" type="button" onClick={limpiarFiltros}>Limpiar filtros</button></div></FiltrosPlegables><p className="vehicle-results" role="status">Mostrando {visibles.length} de {clientes.length} clientes.</p>{visibles.length === 0 ? <div className="directory-message"><p>No hay clientes que coincidan con tu búsqueda.</p><button className="button-secondary" onClick={limpiarFiltros}>Limpiar filtros</button></div> : <div className="table-scroll" tabIndex={0} role="region" aria-label="Datos de clientes, desplázate horizontalmente en pantallas pequeñas"><table className="clients-table"><thead><tr><th scope="col">Nombre</th><th scope="col">Correo electrónico</th><th scope="col">Teléfono</th><th scope="col">Preferencias de búsqueda</th><th scope="col">Acciones</th></tr></thead><tbody>{visibles.map(cliente => <tr key={cliente.id}><th scope="row" className="client-name-cell"><div className="client-identity"><span className="client-initials" aria-hidden="true">{cliente.nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]).join('').toUpperCase()}</span><strong>{cliente.nombre}</strong></div></th><td data-label="Correo"><a className="client-contact" href={`mailto:${cliente.correo}`}>{cliente.correo}</a></td><td data-label="Teléfono"><a className="client-contact client-phone" href={`tel:${cliente.telefono.replace(/[^+0-9]/g, '')}`}>{cliente.telefono}</a></td><td data-label="Preferencias"><PreferenciasCliente texto={cliente.preferencia} nombre={cliente.nombre}/></td><td className="client-actions-cell"><div className="record-actions" aria-label={`Acciones para ${cliente.nombre}`}>
          <Link className="record-action action-edit" to={`/clientes/${cliente.id}/editar`} aria-label={`Editar cliente ${cliente.nombre}`}><Pencil size={16} aria-hidden="true"/>Editar</Link>
          <button type="button" className="record-action action-delete" disabled={eliminandoId !== null} onClick={() => { setErrorEliminar(''); setRegistroAEliminar(cliente); } } aria-label={`Eliminar cliente ${cliente.nombre}`}><Trash2 size={16} aria-hidden="true"/>{eliminandoId === cliente.id ? 'Eliminando…' : 'Eliminar'}</button>
          <Link className="record-action action-feature" to={`/clientes/${cliente.id}/recomendaciones`} aria-label={`Recomendar vehículos para ${cliente.nombre}`}><Sparkles size={16} aria-hidden="true"/>Recomendar vehículos</Link>
        </div></td></tr>)}</tbody></table></div>}</>}
      </section>
    </main>
  </div>;
}
