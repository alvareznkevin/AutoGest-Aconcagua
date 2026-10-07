import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserRoundPlus } from 'lucide-react';
import AppHeader from './AppHeader';
import api from '../api';

export default function ListaClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
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
        {loading ? <p role="status" className="directory-message">Cargando clientes…</p> : error ? <div className="directory-message"><p role="alert">{error}</p><button className="button-secondary" onClick={reintentar}>Reintentar</button><Link to="/login">Ir al inicio de sesión</Link></div> : clientes.length === 0 ? <div className="directory-message"><Users size={32}/><h2>Aún no hay clientes registrados</h2><p>Registra el primer cliente para ver aquí sus datos.</p></div> : <><p className="directory-count">{clientes.length} {clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Datos de clientes, desplázate horizontalmente en pantallas pequeñas"><table className="clients-table"><thead><tr><th scope="col">Nombre</th><th scope="col">Correo electrónico</th><th scope="col">Teléfono</th><th scope="col">Preferencias de búsqueda</th></tr></thead><tbody>{clientes.map(cliente => <tr key={cliente.id}><th scope="row">{cliente.nombre}</th><td>{cliente.correo}</td><td>{cliente.telefono}</td><td>{cliente.preferencia}</td></tr>)}</tbody></table></div></>}
      </section>
    </main>
  </div>;
}
