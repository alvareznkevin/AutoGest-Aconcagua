import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppHeader from './AppHeader';
import api from '../api';
import './RegistroCliente.css';

const valoresIniciales = {
  patente: '',
  marca: '',
  modelo: '',
  anio: '',
  tipo: '',
  color: '',
  kilometraje: '',
  combustible: '',
  transmision: '',
  precio_compra: '',
  precio_venta: '',
  estado: 'disponible',
  descripcion: '',
};

const campos = [
  { nombre: 'patente', etiqueta: 'Patente', maxLength: 10 },
  { nombre: 'marca', etiqueta: 'Marca', maxLength: 50 },
  { nombre: 'modelo', etiqueta: 'Modelo', maxLength: 100 },
  { nombre: 'anio', etiqueta: 'Año', tipo: 'number' },
  {
    nombre: 'tipo',
    etiqueta: 'Tipo de vehículo',
    opciones: [
      ['automovil', 'Automóvil'],
      ['camioneta', 'Camioneta'],
      ['camion', 'Camión'],
    ],
  },
  { nombre: 'color', etiqueta: 'Color', maxLength: 50 },
  {
    nombre: 'kilometraje',
    etiqueta: 'Kilometraje',
    tipo: 'number',
  },
  {
    nombre: 'combustible',
    etiqueta: 'Combustible',
    opciones: [
      ['bencina', 'Bencina'],
      ['diesel', 'Diésel'],
      ['electrico', 'Eléctrico'],
      ['hibrido', 'Híbrido'],
    ],
  },
  {
    nombre: 'transmision',
    etiqueta: 'Transmisión',
    opciones: [
      ['manual', 'Manual'],
      ['automatica', 'Automática'],
    ],
  },
  {
    nombre: 'precio_compra',
    etiqueta: 'Precio de compra (CLP)',
    tipo: 'number',
  },
  {
    nombre: 'precio_venta',
    etiqueta: 'Precio de venta (CLP)',
    tipo: 'number',
  },
  {
    nombre: 'estado',
    etiqueta: 'Estado',
    opciones: [
      ['disponible', 'Disponible'],
      ['reservado', 'Reservado'],
      ['vendido', 'Vendido'],
    ],
  },
];

// Reinicia el formulario al cambiar de vehículo o abrir un registro nuevo.
export default function RegistrarVehiculo() {
  const { id } = useParams();

  return <FormularioVehiculo key={id || 'nuevo'} id={id} />;
}

function FormularioVehiculo({ id }) {
  const editando = Boolean(id);
  const navigate = useNavigate();
  const archivoRef = useRef(null);

  const [valores, setValores] = useState({ ...valoresIniciales });
  const [imagen, setImagen] = useState(null);
  const [tieneImagen, setTieneImagen] = useState(false);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(editando);
  const [errorCarga, setErrorCarga] = useState('');
  const [revision, setRevision] = useState(0);

  const titulo = editando ? 'Editar vehículo' : 'Registrar vehículo';

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    async function cargarVehiculo() {
      try {
        const { data } = await api.get(`vehiculos/${id}/`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const datosFormulario = Object.fromEntries(
          Object.keys(valoresIniciales).map((campo) => [
            campo,
            String(data[campo] ?? ''),
          ]),
        );

        setValores(datosFormulario);
        setTieneImagen(Boolean(data.imagen));
      } catch (error) {
        if (controller.signal.aborted) return;

        setErrorCarga(
          error.response?.status === 404
            ? 'El vehículo no existe.'
            : error.response?.status === 401
              ? 'Tu sesión expiró. Inicia sesión nuevamente.'
              : error.response?.status === 403
                ? 'No tienes permisos para consultar este vehículo.'
                : 'No fue posible cargar los datos del vehículo.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarVehiculo();

    return () => controller.abort();
  }, [id, revision]);

  function reintentar() {
    setErrorCarga('');
    setCargando(true);
    setRevision((actual) => actual + 1);
  }

  function actualizar(event) {
    const { name, value } = event.target;

    setValores((anteriores) => ({
      ...anteriores,
      [name]: value,
    }));

    setErrores((anteriores) => ({
      ...anteriores,
      [name]: null,
    }));

    setMensaje(null);
  }

  async function guardar(event) {
    event.preventDefault();

    if (enviando || cargando || errorCarga) return;

    setEnviando(true);
    setErrores({});
    setMensaje(null);

    try {
      const datos = new FormData();

      Object.entries(valores).forEach(([nombre, valor]) => {
        const texto = String(valor).trim();

        datos.append(
          nombre,
          nombre === 'patente' ? texto.toUpperCase() : texto,
        );
      });

      // Omitir este campo conserva la imagen existente al editar.
      if (imagen) {
        datos.append('imagen', imagen);
      }

      if (editando) {
        await api.patch(`vehiculos/${id}/`, datos);
        navigate('/vehiculos', { replace: true });
        return;
      }

      await api.post('vehiculos/', datos);

      setValores({ ...valoresIniciales });
      setImagen(null);

      if (archivoRef.current) {
        archivoRef.current.value = '';
      }

      setMensaje({
        tipo: 'success',
        texto: 'Vehículo registrado correctamente.',
      });
    } catch (error) {
      const respuesta = error.response;

      if (
        respuesta?.status === 400 &&
        respuesta.data &&
        typeof respuesta.data === 'object'
      ) {
        const erroresRecibidos = Object.fromEntries(
          Object.entries(respuesta.data).map(([campo, detalle]) => [
            campo,
            Array.isArray(detalle) ? detalle.join(' ') : String(detalle),
          ]),
        );

        setErrores(erroresRecibidos);
        setMensaje({
          tipo: 'error',
          texto:
            erroresRecibidos.non_field_errors ||
            erroresRecibidos.detail ||
            'Revisa los datos indicados e intenta nuevamente.',
        });
      } else {
        setMensaje({
          tipo: 'error',
          texto:
            respuesta?.status === 401
              ? 'Tu sesión expiró. Inicia sesión nuevamente.'
              : respuesta?.status === 403
                ? 'No tienes permisos para guardar este vehículo.'
                : respuesta?.status === 404
                  ? 'El vehículo ya no existe o la ruta no está disponible.'
                  : 'No fue posible guardar el vehículo. Comprueba la conexión.',
        });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="clientes-page app-shell">
      <AppHeader />

      <main>
        <div className="breadcrumb">
          <Link to="/dashboard">Inicio</Link>
          <span>/</span>
          <Link to="/vehiculos">Ver vehículos</Link>
          <span>/</span>
          <strong>{titulo}</strong>
        </div>

        <div className="page-heading">
          <div>
            <div className="eyebrow">INVENTARIO VEHICULAR</div>
            <h1>{titulo}</h1>
            <p>
              {editando
                ? 'Actualiza las características, precios y fotografía.'
                : 'Ingresa sus características, precios y fotografía.'}
            </p>
          </div>
        </div>

        {cargando ? (
          <p className="directory-message" role="status">
            Cargando datos del vehículo…
          </p>
        ) : errorCarga ? (
          <div className="directory-message">
            <p role="alert">{errorCarga}</p>
            <button
              type="button"
              className="button-secondary"
              onClick={reintentar}
            >
              Reintentar
            </button>
            <Link to="/vehiculos">Volver al inventario</Link>
            <Link to="/login">Ir al inicio de sesión</Link>
          </div>
        ) : (
          <div className="registration-layout">
            <aside className="intro-panel">
              <h2>Tu inventario, organizado.</h2>
              <p>
                {editando
                  ? 'Mantén actualizados los datos y la disponibilidad de cada vehículo.'
                  : 'Guarda la información de cada vehículo para facilitar su consulta y gestión comercial.'}
              </p>
              <div className="intro-divider" />
              <p>La fotografía y la descripción son opcionales.</p>
              {editando && (
                <p>
                  Si no seleccionas otra foto, se conservará la que
                  está guardada.
                </p>
              )}
            </aside>

            <form className="registration-form" onSubmit={guardar}>
              <div className="section-heading">
                <span className="step-badge">01</span>
                <div>
                  <h2>Datos del vehículo</h2>
                  <p>Completa los campos obligatorios.</p>
                </div>
              </div>

              <div className="fields">
                {campos.map((campo) => {
                  const atributos = {
                    id: campo.nombre,
                    name: campo.nombre,
                    value: valores[campo.nombre],
                    onChange: actualizar,
                    required: true,
                    disabled: enviando,
                    'aria-invalid': Boolean(errores[campo.nombre]),
                    'aria-describedby': errores[campo.nombre]
                      ? `${campo.nombre}-error`
                      : undefined,
                  };

                  return (
                    <div className="field" key={campo.nombre}>
                      <label htmlFor={campo.nombre}>
                        {campo.etiqueta} <span>*</span>
                      </label>

                      <div
                        className={`input-wrap ${
                          errores[campo.nombre] ? 'invalid' : ''
                        }`}
                      >
                        {campo.opciones ? (
                          <select
                            {...atributos}
                            style={{
                              width: '100%',
                              padding: '13px 0',
                              border: 0,
                              background: 'transparent',
                              color: 'inherit',
                              font: 'inherit',
                            }}
                          >
                            <option value="">Selecciona una opción</option>
                            {campo.opciones.map(([valor, etiqueta]) => (
                              <option key={valor} value={valor}>
                                {etiqueta}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            {...atributos}
                            type={campo.tipo || 'text'}
                            maxLength={campo.maxLength}
                            min={campo.tipo === 'number' ? 0 : undefined}
                            step={campo.tipo === 'number' ? 1 : undefined}
                          />
                        )}
                      </div>

                      {errores[campo.nombre] && (
                        <small
                          className="field-error"
                          id={`${campo.nombre}-error`}
                        >
                          {errores[campo.nombre]}
                        </small>
                      )}
                    </div>
                  );
                })}
              </div>

              <section className="preferences-section">
                <div className="section-heading">
                  <span className="step-badge">02</span>
                  <div>
                    <h2>Información adicional</h2>
                    <p>Agrega una descripción y una fotografía.</p>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="descripcion">Descripción</label>
                  <div className="input-wrap textarea-wrap">
                    <textarea
                      id="descripcion"
                      name="descripcion"
                      rows={4}
                      value={valores.descripcion}
                      onChange={actualizar}
                      disabled={enviando}
                      placeholder="Equipamiento, condición u observaciones."
                      aria-invalid={Boolean(errores.descripcion)}
                      aria-describedby={
                        errores.descripcion ? 'descripcion-error' : undefined
                      }
                    />
                  </div>

                  {errores.descripcion && (
                    <small className="field-error" id="descripcion-error">
                      {errores.descripcion}
                    </small>
                  )}
                </div>

                <div className="field" style={{ marginTop: 20 }}>
                  <label htmlFor="imagen">
                    {editando ? 'Reemplazar fotografía' : 'Fotografía'}
                  </label>

                  <div className="input-wrap">
                    <input
                      ref={archivoRef}
                      id="imagen"
                      name="imagen"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={enviando}
                      aria-invalid={Boolean(errores.imagen)}
                      aria-describedby="imagen-ayuda imagen-error"
                      onChange={(event) => {
                        setImagen(event.target.files?.[0] || null);
                        setErrores((anteriores) => ({
                          ...anteriores,
                          imagen: null,
                        }));
                        setMensaje(null);
                      }}
                    />
                  </div>

                  <small className="field-hint" id="imagen-ayuda">
                    {editando && tieneImagen
                      ? 'Hay una foto guardada. Se conservará si no seleccionas otra.'
                      : 'Puedes seleccionar una fotografía JPG, PNG o WebP.'}
                  </small>

                  {errores.imagen && (
                    <small className="field-error" id="imagen-error">
                      {errores.imagen}
                    </small>
                  )}
                </div>
              </section>

              {mensaje && (
                <div
                  className={`feedback ${mensaje.tipo}`}
                  role={mensaje.tipo === 'error' ? 'alert' : 'status'}
                >
                  {mensaje.texto}
                </div>
              )}

              <div className="form-footer">
                <span>* Campos obligatorios</span>
                <button type="submit" disabled={enviando}>
                  {enviando
                    ? 'Guardando…'
                    : editando
                      ? 'Guardar cambios'
                      : 'Registrar vehículo'}
                </button>
              </div>

              <div style={{ marginTop: 18 }}>
                <Link to="/vehiculos">Volver al inventario</Link>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}