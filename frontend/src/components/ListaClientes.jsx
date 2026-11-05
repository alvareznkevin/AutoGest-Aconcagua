import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserRoundPlus, Pencil, Search } from 'lucide-react';
import AppHeader from './AppHeader';
import api from '../api';
import './ListaVehiculos.css';
import './ListaClientes.css';

const filtrosIniciales = { nombre: '', correo: '', telefono: '', preferencia: '' };
function normalizar(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export default function ListaClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({ ...filtrosIniciales });
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
    <main className="workspace">
      <div className="section-kicker">GESTIÓN COMERCIAL</div>
      <section className="dashboard-welcome"><div><h1>Clientes registrados</h1><p>Datos de contacto y preferencias de búsqueda de tus clientes.</p></div><Link className="button-primary" to="/clientes/registrar"><UserRoundPlus size={18}/>Registrar cliente</Link></section>
      <section className="client-directory" aria-label="Listado de clientes" aria-busy={loading}>
        {loading ? <p role="status" className="directory-message">Cargando clientes…</p> : error ? <div className="directory-message"><p role="alert">{error}</p><button className="button-secondary" onClick={reintentar}>Reintentar</button><Link to="/login">Ir al inicio de sesión</Link></div> : clientes.length === 0 ? <div className="directory-message"><Users size={32}/><h2>Aún no hay clientes registrados</h2><p>Registra el primer cliente para ver aquí sus datos.</p></div> : <><p className="directory-count">{clientes.length} {clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}</p><div className="vehicle-toolbar"><label className="vehicle-search"><Search size={18}/><span className="vehicle-sr-only">Buscar clientes</span><input type="search" placeholder="Nombre, correo, teléfono o preferencias" value={busqueda} onChange={event => setBusqueda(event.target.value)}/></label></div><div className="vehicle-filters client-filters">{[['nombre', 'Nombre'], ['correo', 'Correo electrónico'], ['telefono', 'Teléfono'], ['preferencia', 'Preferencias de búsqueda']].map(([campo, etiqueta]) => <label key={campo}>{etiqueta}<input type="search" name={campo} value={filtros[campo]} onChange={event => setFiltros(previous => ({ ...previous, [campo]: event.target.value }))}/></label>)}<button className="button-secondary" type="button" onClick={limpiarFiltros}>Limpiar filtros</button></div><p className="vehicle-results" role="status">Mostrando {visibles.length} de {clientes.length} clientes.</p>{visibles.length === 0 ? <div className="directory-message"><p>No hay clientes que coincidan con tu búsqueda.</p><button className="button-secondary" onClick={limpiarFiltros}>Limpiar filtros</button></div> : <div className="table-scroll" tabIndex={0} role="region" aria-label="Datos de clientes, desplázate horizontalmente en pantallas pequeñas"><table className="clients-table"><thead><tr><th scope="col">Nombre</th><th scope="col">Correo electrónico</th><th scope="col">Teléfono</th><th scope="col">Preferencias de búsqueda</th><th scope="col">Acciones</th></tr></thead><tbody>{visibles.map(cliente => <tr key={cliente.id}><th scope="row">{cliente.nombre}</th><td>{cliente.correo}</td><td>{cliente.telefono}</td><td>{cliente.preferencia}</td><td><Link className="button-secondary client-edit" to={`/clientes/${cliente.id}/editar`} aria-label={`Editar cliente ${cliente.nombre}`}><Pencil size={16}/>Editar cliente</Link></td></tr>)}</tbody></table></div>}</>}
      </section>
    </main>
  </div>;
}
