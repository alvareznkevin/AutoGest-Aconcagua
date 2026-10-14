import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

export default function RegistrarVehiculo() {
  const [valores, setValores] = useState(valoresIniciales);
  const [imagen, setImagen] = useState(null);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const archivoRef = useRef(null);

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

  async function registrar(event) {
    event.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setErrores({});
    setMensaje(null);

    const datos = new FormData();

    Object.entries(valores).forEach(([nombre, valor]) => {
      const texto = valor.trim();

      datos.append(
        nombre,
        nombre === 'patente' ? texto.toUpperCase() : texto,
      );
    });

    if (imagen) {
      datos.append('imagen', imagen);
    }

    try {
      await api.post('vehiculos/', datos);

      setValores(valoresIniciales);
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

      if (respuesta?.status === 400) {
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
              : 'No fue posible registrar el vehículo. Comprueba la conexión.',
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
          <strong>Registrar vehículo</strong>
        </div>

        <div className="page-heading">
          <div>
            <div className="eyebrow">INVENTARIO VEHICULAR</div>
            <h1>Registrar vehículo</h1>
            <p>Ingresa sus características, precios y fotografía.</p>
          </div>
        </div>

        <div className="registration-layout">
          <aside className="intro-panel">
            <h2>Tu inventario, organizado.</h2>
            <p>
              Guarda la información de cada vehículo para facilitar
              su consulta y gestión comercial.
            </p>
            <div className="intro-divider" />
            <p>La fotografía y la descripción son opcionales.</p>
          </aside>

          <form className="registration-form" onSubmit={registrar}>
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
                  />
                </div>
                {errores.descripcion && (
                  <small className="field-error">
                    {errores.descripcion}
                  </small>
                )}
              </div>

              <div className="field" style={{ marginTop: 20 }}>
                <label htmlFor="imagen">Fotografía</label>
                <div className="input-wrap">
                  <input
                    ref={archivoRef}
                    id="imagen"
                    name="imagen"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={enviando}
                    aria-invalid={Boolean(errores.imagen)}
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
                {errores.imagen && (
                  <small className="field-error">{errores.imagen}</small>
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
                {enviando ? 'Registrando…' : 'Registrar vehículo'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}