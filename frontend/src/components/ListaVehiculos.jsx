import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CarFront, Plus, Search } from 'lucide-react';
import AppHeader from './AppHeader';
import api from '../api';
import './ListaVehiculos.css';

const etiquetas = {
  automovil: 'Automóvil', camioneta: 'Camioneta', camion: 'Camión',
  bencina: 'Bencina', diesel: 'Diésel', electrico: 'Eléctrico', hibrido: 'Híbrido',
  manual: 'Manual', automatica: 'Automática',
  disponible: 'Disponible', reservado: 'Reservado', vendido: 'Vendido',
};
const moneda = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat('es-CL');

function FotoVehiculo({ vehiculo }) {
  const [fallo, setFallo] = useState(false);
  const foto = vehiculo.imagen
    ? new URL(vehiculo.imagen, new URL(api.defaults.baseURL, window.location.origin)).href
    : null;
  return <div className="vehicle-photo">
    {foto && !fallo
      ? <img src={foto} alt={`${vehiculo.marca} ${vehiculo.modelo}, patente ${vehiculo.patente}`} loading="lazy" onError={() => setFallo(true)} />
      : <div className="vehicle-photo-placeholder"><CarFront size={48} strokeWidth={1.3} /><span>{fallo ? 'Fotografía no disponible' : 'Sin fotografía'}</span></div>}
  </div>;
}

export default function ListaVehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      const filas = [];
      try {
        let url = 'vehiculos/';
        while (url) {
          const { data } = await api.get(url, { signal: controller.signal });
          const pagina = Array.isArray(data) ? data : data.results;
          if (!Array.isArray(pagina)) throw new Error('Respuesta inesperada');
          filas.push(...pagina);
          url = Array.isArray(data) ? null : data.next;
        }
        if (!controller.signal.aborted) setVehiculos(filas);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.response?.status === 401
          ? 'Tu sesión expiró. Vuelve a iniciar sesión para consultar el inventario.'
          : err.response?.status === 403 ? 'No tienes permisos para consultar el inventario.'
          : 'No se pudieron cargar los vehículos. Comprueba la conexión e inténtalo nuevamente.');
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    cargar();
    return () => controller.abort();
  }, [revision]);

  const visibles = vehiculos.filter(v => [v.patente, v.marca, v.modelo, v.anio]
    .some(valor => String(valor ?? '').toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'))));

  function reintentar() {
    setError(''); setCargando(true); setRevision(actual => actual + 1);
  }

  return <div className="vehicles-page">
    <AppHeader />
    <main className="workspace">
      <div className="section-kicker">INVENTARIO VEHICULAR</div>
      <section className="dashboard-welcome">
        <div><h1>Vehículos registrados</h1><p>Consulta las fotografías, características y precios de tu inventario.</p></div>
        <Link className="button-primary" to="/vehiculos/registrar"><Plus size={18} />Registrar vehículo</Link>
      </section>
      <section aria-label="Listado de vehículos" aria-busy={cargando}>
        {cargando ? <p className="directory-message" role="status">Cargando vehículos…</p>
          : error ? <div className="directory-message"><p role="alert">{error}</p><button className="button-secondary" onClick={reintentar}>Reintentar</button><Link to="/login">Ir al inicio de sesión</Link></div>
            : vehiculos.length === 0 ? <div className="directory-message"><CarFront size={32} /><h2>Aún no hay vehículos registrados</h2><p>Registra el primero para verlo aquí con sus datos.</p><Link className="button-primary" to="/vehiculos/registrar">Registrar vehículo</Link></div>
              : <>
                <div className="vehicle-toolbar">
                  <p role="status">{vehiculos.length} {vehiculos.length === 1 ? 'vehículo registrado' : 'vehículos registrados'}</p>
                  <label className="vehicle-search"><Search size={18} /><span className="vehicle-sr-only">Buscar por patente, marca, modelo o año</span><input type="search" placeholder="Patente, marca, modelo o año" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
                </div>
                {visibles.length === 0 ? <p className="directory-message" role="status">No hay vehículos que coincidan con tu búsqueda.</p>
                  : <div className="vehicle-grid">{visibles.map(v => <article className="vehicle-card" key={v.id}>
                    <FotoVehiculo vehiculo={v} />
                    <div className="vehicle-card-body">
                      <div className="vehicle-card-top"><span className="vehicle-plate">{v.patente}</span><span className={`vehicle-status vehicle-status-${v.estado}`}>{etiquetas[v.estado] || v.estado}</span></div>
                      <h2>{v.marca} {v.modelo}</h2>
                      <p className="vehicle-price">{moneda.format(Number(v.precio_venta))}<small>Precio de venta</small></p>
                      <dl className="vehicle-details">
                        <div><dt>Año</dt><dd>{v.anio}</dd></div>
                        <div><dt>Kilometraje</dt><dd>{numero.format(v.kilometraje)} km</dd></div>
                        <div><dt>Tipo</dt><dd>{etiquetas[v.tipo] || v.tipo}</dd></div>
                        <div><dt>Color</dt><dd>{v.color}</dd></div>
                        <div><dt>Combustible</dt><dd>{etiquetas[v.combustible] || v.combustible}</dd></div>
                        <div><dt>Transmisión</dt><dd>{etiquetas[v.transmision] || v.transmision}</dd></div>
                        <div><dt>Precio de compra</dt><dd>{moneda.format(Number(v.precio_compra))}</dd></div>
                        <div><dt>ID del registro</dt><dd>{v.id}</dd></div>
                      </dl>
                      {v.descripcion && <p className="vehicle-description">{v.descripcion}</p>}
                    </div>
                  </article>)}</div>}
              </>}
      </section>
      <footer className="workspace-footer"><span>AutoGest Aconcagua</span><span>Inventario vehicular</span></footer>
    </main>
  </div>;
}
