import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppHeader from './AppHeader';
import api from '../api';
import './RegistroCliente.css';
import NumeroVehiculo from './NumeroVehiculo';

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
  precio_compra: '0',
  precio_venta: '0',
  estado: 'disponible',
  descripcion: '',
  vin: '',
  numero_motor: '',
  version: '',
  cilindrada: '',
  puertas: '',
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

campos.push(
  { nombre: 'vin', etiqueta: 'VIN / chasis', maxLength: 50, opcional: true },
  { nombre: 'numero_motor', etiqueta: 'Número de motor', maxLength: 100, opcional: true },
  { nombre: 'version', etiqueta: 'Versión', maxLength: 150, opcional: true },
  { nombre: 'cilindrada', etiqueta: 'Cilindrada / motor (según proveedor)', maxLength: 50, opcional: true },
  { nombre: 'puertas', etiqueta: 'Puertas', tipo: 'number', opcional: true },
);

// Reinicia el formulario al cambiar de vehículo o abrir un registro nuevo.
export default function RegistrarVehiculo() {
  const { id } = useParams();

  return <FormularioVehiculo key={id || 'nuevo'} id={id} />;
}

function FormularioVehiculo({ id }) {
  const editando = Boolean(id);
  const navigate = useNavigate();
  const archivoRef = useRef(null);
  const consultaRef = useRef(null);
  const importadosRef = useRef({});
  const ultimaPatenteRef = useRef('');
  const [consultando, setConsultando] = useState(false);
  const [avisoPatente, setAvisoPatente] = useState(null);

  useEffect(() => () => consultaRef.current?.abort(), []);

  async function consultarPatente() {
    if (editando || consultando || enviando) return;
    const patente = valores.patente.replace(/[\s-]/g, '').toUpperCase();
    if (ultimaPatenteRef.current === patente) return;
    if (!/^(?:[A-Z]{2}\d{4}|[A-Z]{4}\d{2})$/.test(patente)) {
      setAvisoPatente({ tipo: 'error', texto: 'Ingresa una patente chilena válida: AB1234 o ABCD12.' });
      return;
    }
    const controller = new AbortController();
    consultaRef.current = controller;
    setConsultando(true);
    setAvisoPatente(null);
    try {
      const { data } = await api.get('vehiculos/consultar-patente/', { params: { patente }, signal: controller.signal });
      if (controller.signal.aborted) return;
      ultimaPatenteRef.current = patente;
      const datos = Object.fromEntries(Object.entries(data.datos).filter(([campo]) => ['marca', 'modelo', 'anio', 'tipo', 'color', 'kilometraje', 'combustible', 'transmision', 'vin', 'numero_motor', 'version', 'cilindrada', 'puertas'].includes(campo)).map(([campo, valor]) => [campo, String(valor)]));
      const nuevos = Object.fromEntries(Object.entries(datos).filter(([campo]) => !valores[campo]));
      importadosRef.current = { ...importadosRef.current, ...nuevos };
      setValores(anteriores => ({ ...anteriores, ...nuevos, patente }));
      setErrores(anteriores => Object.fromEntries(Object.entries(anteriores).filter(([campo]) => !(campo in nuevos))));
      setAvisoPatente({ tipo: 'success', texto: Object.keys(nuevos).length ? 'Datos disponibles completados desde GetAPI Chile. Revísalos y completa los campos restantes. El kilometraje puede corresponder a una revisión anterior.' : 'La consulta no agregó datos. Los campos que ya completaste se conservaron; revisa los datos manualmente.' });
    } catch (error) {
      if (!controller.signal.aborted) setAvisoPatente({ tipo: 'error', texto: error.response?.data?.detail || 'No se pudo consultar la patente. Puedes completar los datos manualmente.' });
    } finally {
      if (!controller.signal.aborted) setConsultando(false);
    }
  }

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

    if (name === 'patente') {
      consultaRef.current?.abort();
      setConsultando(false);
      setAvisoPatente(null);
      ultimaPatenteRef.current = '';
      const importados = importadosRef.current;
      setValores(anteriores => Object.fromEntries(Object.entries(anteriores).map(([campo, actual]) => [campo, importados[campo] === actual ? '' : actual])));
      importadosRef.current = {};
    }

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

    if (enviando || consultando || cargando || errorCarga) return;

    const preciosInvalidos = Object.fromEntries(['precio_compra', 'precio_venta'].filter(campo => !/^\d+$/.test(valores[campo])).map(campo => [campo, 'Ingresa un precio entero igual o mayor que $0.']));
    if (Object.keys(preciosInvalidos).length) {
      setErrores(preciosInvalidos);
      setMensaje({ tipo: 'error', texto: 'Ingresa precios enteros iguales o mayores que $0.' });
      event.currentTarget.elements.namedItem(Object.keys(preciosInvalidos)[0])?.focus();
      return;
    }

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
      navigate('/vehiculos', { replace: true });
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
                    required: !campo.opcional,
                    disabled: enviando || (consultando && campo.nombre !== 'patente'),
                    'aria-invalid': Boolean(errores[campo.nombre]),
                    'aria-describedby': errores[campo.nombre]
                      ? `${campo.nombre}-error`
                      : undefined,
                  };

                  return (
                    <div className="field" key={campo.nombre}>
                      <label htmlFor={campo.nombre}>
                        {campo.etiqueta} {!campo.opcional && <span>*</span>}
                      </label>

                      <div
                        className={`input-wrap ${
                          errores[campo.nombre] ? 'invalid' : ''
                        }`}
                      >
                        {['precio_compra', 'precio_venta', 'kilometraje'].includes(campo.nombre) ? (
                          <NumeroVehiculo {...atributos} moneda={campo.nombre !== 'kilometraje'} aria-describedby={`${errores[campo.nombre] ? `${campo.nombre}-error ` : ''}${campo.nombre}-hint`} />
                        ) : campo.opciones ? (
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
                            onBlur={campo.nombre === 'patente' && !editando ? () => { if (/^(?:[A-Z]{2}\d{4}|[A-Z]{4}\d{2})$/.test(valores.patente.replace(/[\s-]/g, '').toUpperCase())) consultarPatente(); } : undefined}
                          />
                        )}
                      </div>

                      {['precio_compra', 'precio_venta', 'kilometraje'].includes(campo.nombre) && <small className="field-hint" id={`${campo.nombre}-hint`}>{campo.nombre === 'kilometraje' ? 'Kilómetros enteros. Ejemplo: 125.000 km.' : 'Pesos chilenos. Ingresa un valor igual o mayor que $0.'}</small>}
                      {campo.nombre === 'estado' && valores.estado === 'vendido' && <small className="field-hint">Al guardar como vendido se registra un ingreso por el precio de venta, que debe ser mayor que $0. No necesitas anotarlo nuevamente en Inicio.</small>}

                      {campo.nombre === 'patente' && !editando && <>
                        <button type="button" className="button-secondary" disabled={consultando || enviando || !valores.patente.trim()} onClick={consultarPatente}>{consultando ? 'Consultando patente…' : 'Consultar patente'}</button>
                        <small className="field-hint">Se consulta al salir del campo. Puedes corregir o completar los datos manualmente.</small>
                        {avisoPatente && <p className={avisoPatente.tipo === 'error' ? 'field-error' : 'field-hint'} role={avisoPatente.tipo === 'error' ? 'alert' : 'status'}>{avisoPatente.texto}</p>}
                      </>}

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
                <button type="submit" disabled={enviando || consultando}>
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
