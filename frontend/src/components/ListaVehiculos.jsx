import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CarFront, Plus, Search, Pencil } from 'lucide-react';
import AppHeader from './AppHeader';
import api from '../api';
import './ListaVehiculos.css';

const etiquetas = {
  automovil: 'Automóvil',
  camioneta: 'Camioneta',
  camion: 'Camión',
  bencina: 'Bencina',
  diesel: 'Diésel',
  electrico: 'Eléctrico',
  hibrido: 'Híbrido',
  manual: 'Manual',
  automatica: 'Automática',
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
};

const moneda = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const numero = new Intl.NumberFormat('es-CL');

const filtrosIniciales = {
  marca: '',
  estado: '',
  tipo: '',
  anioDesde: '',
  anioHasta: '',
  precioDesde: '',
  precioHasta: '',
};

const camposNumericos = [
  ['anioDesde', 'Año desde'],
  ['anioHasta', 'Año hasta'],
  ['precioDesde', 'Precio mínimo (CLP)'],
  ['precioHasta', 'Precio máximo (CLP)'],
];

function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function FotoVehiculo({ vehiculo }) {
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!vehiculo.imagen) return;

    const controller = new AbortController();
    let objetoUrl;

    async function cargarFoto() {
      try {
        const { data } = await api.get(
          `vehiculos/${vehiculo.id}/imagen/`,
          {
            responseType: 'blob',
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted) return;

        objetoUrl = URL.createObjectURL(data);

        setResultado({
          id: vehiculo.id,
          imagen: vehiculo.imagen,
          foto: objetoUrl,
          fallo: false,
        });
      } catch {
        if (!controller.signal.aborted) {
          setResultado({
            id: vehiculo.id,
            imagen: vehiculo.imagen,
            fallo: true,
          });
        }
      }
    }

    cargarFoto();

    return () => {
      controller.abort();

      if (objetoUrl) {
        URL.revokeObjectURL(objetoUrl);
      }
    };
  }, [vehiculo.id, vehiculo.imagen]);

  const actual =
    resultado?.id === vehiculo.id &&
    resultado?.imagen === vehiculo.imagen
      ? resultado
      : null;

  return (
    <div className="vehicle-photo">
      {actual?.foto && !actual.fallo ? (
        <img
          src={actual.foto}
          alt={`${vehiculo.marca} ${vehiculo.modelo}, patente ${vehiculo.patente}`}
          loading="lazy"
          onError={() => {
            setResultado({
              id: vehiculo.id,
              imagen: vehiculo.imagen,
              fallo: true,
            });
          }}
        />
      ) : (
        <div className="vehicle-photo-placeholder">
          <CarFront size={48} strokeWidth={1.3} />
          <span>
            {actual?.fallo
              ? 'Fotografía no disponible'
              : vehiculo.imagen
                ? 'Cargando fotografía…'
                : 'Sin fotografía'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ListaVehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({ ...filtrosIniciales });

  useEffect(() => {
    const controller = new AbortController();

    async function cargar() {
      try {
        let url = 'vehiculos/';
        const filas = [];

        while (url) {
          const { data } = await api.get(url, {
            signal: controller.signal,
          });

          const pagina = Array.isArray(data) ? data : data.results;

          if (!Array.isArray(pagina)) {
            throw new Error('Respuesta inesperada');
          }

          filas.push(...pagina);
          url = Array.isArray(data) ? null : data.next;
        }

        if (!controller.signal.aborted) {
          setVehiculos(filas);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.status === 401
              ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
              : err.response?.status === 403
                ? 'No tienes permisos para consultar el inventario.'
                : 'No se pudieron cargar los vehículos. Comprueba la conexión.',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => controller.abort();
  }, [revision]);

  function actualizarFiltro(event) {
    const { name, value } = event.target;

    setFiltros((anteriores) => ({
      ...anteriores,
      [name]: value,
    }));
  }

  function limpiarFiltros() {
    setBusqueda('');
    setFiltros({ ...filtrosIniciales });
  }

  function reintentar() {
    setError('');
    setCargando(true);
    setRevision((actual) => actual + 1);
  }

  const marcas = [...new Set(vehiculos.map((v) => v.marca))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'));

  const rangoInvalido =
    (
      filtros.anioDesde !== '' &&
      filtros.anioHasta !== '' &&
      Number(filtros.anioDesde) > Number(filtros.anioHasta)
    ) ||
    (
      filtros.precioDesde !== '' &&
      filtros.precioHasta !== '' &&
      Number(filtros.precioDesde) > Number(filtros.precioHasta)
    );

  const numerosInvalidos = camposNumericos.some(([campo]) => {
    if (filtros[campo] === '') return false;

    const valor = Number(filtros[campo]);
    return !Number.isFinite(valor) || valor < 0 || !Number.isInteger(valor);
  });

  const filtrosInvalidos = rangoInvalido || numerosInvalidos;
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);

  const visibles = vehiculos.filter((vehiculo) => {
    const texto = normalizar(
      `${vehiculo.patente} ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`,
    );

    return (
      !filtrosInvalidos &&
      palabras.every((palabra) => texto.includes(palabra)) &&
      (!filtros.marca || vehiculo.marca === filtros.marca) &&
      (!filtros.estado || vehiculo.estado === filtros.estado) &&
      (!filtros.tipo || vehiculo.tipo === filtros.tipo) &&
      (
        filtros.anioDesde === '' ||
        Number(vehiculo.anio) >= Number(filtros.anioDesde)
      ) &&
      (
        filtros.anioHasta === '' ||
        Number(vehiculo.anio) <= Number(filtros.anioHasta)
      ) &&
      (
        filtros.precioDesde === '' ||
        Number(vehiculo.precio_venta) >= Number(filtros.precioDesde)
      ) &&
      (
        filtros.precioHasta === '' ||
        Number(vehiculo.precio_venta) <= Number(filtros.precioHasta)
      )
    );
  });

  return (
    <div className="vehicles-page">
      <AppHeader />

      <main className="workspace">
        <div className="section-kicker">INVENTARIO VEHICULAR</div>

        <section className="dashboard-welcome">
          <div>
            <h1>Vehículos registrados</h1>
            <p>
              Consulta fotografías, características y precios de tu inventario.
            </p>
          </div>

          <Link className="button-primary" to="/vehiculos/registrar">
            <Plus size={18} />
            Registrar vehículo
          </Link>
        </section>

        <section aria-label="Listado de vehículos" aria-busy={cargando}>
          {cargando ? (
            <p className="directory-message" role="status">
              Cargando vehículos…
            </p>
          ) : error ? (
            <div className="directory-message">
              <p role="alert">{error}</p>
              <button className="button-secondary" onClick={reintentar}>
                Reintentar
              </button>
              <Link to="/login">Ir al inicio de sesión</Link>
            </div>
          ) : vehiculos.length === 0 ? (
            <div className="directory-message">
              <CarFront size={32} />
              <h2>Aún no hay vehículos registrados</h2>
              <p>Registra el primero para verlo aquí con sus datos.</p>
              <Link className="button-primary" to="/vehiculos/registrar">
                Registrar vehículo
              </Link>
            </div>
          ) : (
            <>
              <div className="vehicle-toolbar">
                <p>
                  {vehiculos.length}{' '}
                  {vehiculos.length === 1
                    ? 'vehículo registrado'
                    : 'vehículos registrados'}
                </p>

                <label className="vehicle-search">
                  <Search size={18} />
                  <span className="vehicle-sr-only">
                    Buscar por patente, marca, modelo o año
                  </span>
                  <input
                    type="search"
                    placeholder="Patente, marca, modelo o año"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                  />
                </label>
              </div>

              <div className="vehicle-filters">
                <label>
                  Marca
                  <select
                    name="marca"
                    value={filtros.marca}
                    onChange={actualizarFiltro}
                  >
                    <option value="">Todas las marcas</option>
                    {marcas.map((marca) => (
                      <option key={marca} value={marca}>
                        {marca}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Estado
                  <select
                    name="estado"
                    value={filtros.estado}
                    onChange={actualizarFiltro}
                  >
                    <option value="">Todos los estados</option>
                    <option value="disponible">Disponible</option>
                    <option value="reservado">Reservado</option>
                    <option value="vendido">Vendido</option>
                  </select>
                </label>

                <label>
                  Tipo
                  <select
                    name="tipo"
                    value={filtros.tipo}
                    onChange={actualizarFiltro}
                  >
                    <option value="">Todos los tipos</option>
                    <option value="automovil">Automóvil</option>
                    <option value="camioneta">Camioneta</option>
                    <option value="camion">Camión</option>
                  </select>
                </label>

                {camposNumericos.map(([nombre, etiqueta]) => (
                  <label key={nombre}>
                    {etiqueta}
                    <input
                      type="number"
                      name={nombre}
                      min="0"
                      step="1"
                      value={filtros[nombre]}
                      onChange={actualizarFiltro}
                    />
                  </label>
                ))}

                <button
                  type="button"
                  className="button-secondary"
                  onClick={limpiarFiltros}
                >
                  Limpiar filtros
                </button>
              </div>

              {filtrosInvalidos ? (
                <p role="alert" className="field-error">
                  {rangoInvalido
                    ? 'El valor mínimo no puede ser mayor que el máximo.'
                    : 'Ingresa años y precios enteros, iguales o mayores que cero.'}
                </p>
              ) : (
                <p role="status" className="vehicle-results">
                  Mostrando {visibles.length} de {vehiculos.length} vehículos.
                </p>
              )}

              {!filtrosInvalidos && (
                visibles.length === 0 ? (
                  <div className="directory-message">
                    <p role="status">
                      No hay vehículos que coincidan con tu búsqueda.
                    </p>
                    <button
                      className="button-secondary"
                      onClick={limpiarFiltros}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                ) : (
                  <div className="vehicle-grid">
                    {visibles.map((vehiculo) => (
                      <article className="vehicle-card" key={vehiculo.id}>
                        <FotoVehiculo vehiculo={vehiculo} />

                        <div className="vehicle-card-body">
                          <div className="vehicle-card-top">
                            <span className="vehicle-plate">
                              {vehiculo.patente}
                            </span>
                            <span
                              className={`vehicle-status vehicle-status-${vehiculo.estado}`}
                            >
                              {etiquetas[vehiculo.estado] || vehiculo.estado}
                            </span>
                          </div>

                          <h2>{vehiculo.marca} {vehiculo.modelo}</h2>

                          <p className="vehicle-price">
                            {moneda.format(Number(vehiculo.precio_venta))}
                            <small>Precio de venta</small>
                          </p>

                          <dl className="vehicle-details">
                            <div>
                              <dt>Año</dt>
                              <dd>{vehiculo.anio}</dd>
                            </div>
                            <div>
                              <dt>Kilometraje</dt>
                              <dd>{numero.format(vehiculo.kilometraje)} km</dd>
                            </div>
                            <div>
                              <dt>Tipo</dt>
                              <dd>{etiquetas[vehiculo.tipo] || vehiculo.tipo}</dd>
                            </div>
                            <div>
                              <dt>Color</dt>
                              <dd>{vehiculo.color}</dd>
                            </div>
                            <div>
                              <dt>Combustible</dt>
                              <dd>
                                {etiquetas[vehiculo.combustible] ||
                                  vehiculo.combustible}
                              </dd>
                            </div>
                            <div>
                              <dt>Transmisión</dt>
                              <dd>
                                {etiquetas[vehiculo.transmision] ||
                                  vehiculo.transmision}
                              </dd>
                            </div>
                            <div>
                              <dt>Precio de compra</dt>
                              <dd>
                                {moneda.format(Number(vehiculo.precio_compra))}
                              </dd>
                            </div>
                            <div>
                              <dt>ID del registro</dt>
                              <dd>{vehiculo.id}</dd>
                            </div>
                          </dl>

                          {vehiculo.descripcion && (
                            <p className="vehicle-description">
                              {vehiculo.descripcion}
                            </p>
                          )}

                          <div className="vehicle-card-actions">
                            <Link className="button-secondary" to={`/vehiculos/${vehiculo.id}`}>Ver detalle y tasación</Link>
                            <Link
                              className="button-secondary"
                              to={`/vehiculos/${vehiculo.id}/editar`}
                              aria-label={`Editar vehículo ${vehiculo.patente}`}
                            >
                              <Pencil size={16} />
                              Editar vehículo
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </section>

        <footer className="workspace-footer">
          <span>AutoGest Aconcagua</span>
          <span>Inventario vehicular</span>
        </footer>
      </main>
    </div>
  );
}
