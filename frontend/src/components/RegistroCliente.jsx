import { useEffect, useRef, useState } from 'react'
import { Check, CheckCircle2, CircleAlert, Mail, Phone, Search, UserRound, UserRoundPlus } from 'lucide-react'
import './RegistroCliente.css'
import AppHeader from './AppHeader'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api';

const initialValues = { nombre: '', correo: '', telefono: '', preferencias: '' }

export default function RegistroCliente() {
  const { id } = useParams()
  return <FormularioCliente key={id || 'nuevo'} id={id} />
}

function FormularioCliente({ id }) {
  const navigate = useNavigate()
  const editando = Boolean(id)
  const [cargando, setCargando] = useState(editando)
  const [errorCarga, setErrorCarga] = useState('')
  const [revision, setRevision] = useState(0)
  const titulo = editando ? 'Editar cliente' : 'Registrar cliente'
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef(null)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    async function cargar() {
      try {
        const { data } = await api.get(`clientes/${id}/`, { signal: controller.signal })
        if (!controller.signal.aborted) setValues({ nombre: data.nombre, correo: data.correo, telefono: data.telefono, preferencias: data.preferencia })
      } catch (error) {
        if (!controller.signal.aborted) setErrorCarga(error.response?.status === 404 ? 'El cliente no existe.' : 'No se pudo cargar el cliente. Comprueba tu conexión y los permisos de tu sesión.')
      } finally {
        if (!controller.signal.aborted) setCargando(false)
      }
    }
    cargar()
    return () => controller.abort()
  }, [id, revision])

  function update(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: false }))
    setResult(null)
  }

  async function submit(event) {
  event.preventDefault();

  if (enviando) return;

  const form = formRef.current;

  const nextErrors = Object.fromEntries(
    Object.keys(initialValues).map((name) => [
      name,
      !values[name].trim() ||
        !form.elements.namedItem(name).validity.valid,
    ]),
  );

  setErrors(nextErrors);

  const firstError = Object.keys(nextErrors).find(
    (name) => nextErrors[name],
  );

  if (firstError) {
    setResult('error');
    form.elements.namedItem(firstError).focus();
    return;
  }

  setEnviando(true);
  setResult(null);

  try {
    await api[editando ? 'patch' : 'post'](editando ? `clientes/${id}/` : 'clientes/', {
      nombre: values.nombre.trim(),
      correo: values.correo.trim(),
      telefono: values.telefono.trim(),
      preferencia: values.preferencias.trim(),
    });

    setResult('success');
    navigate('/clientes', { replace: true });
  } catch {
    setResult('error');
  } finally {
    setEnviando(false);
  }
}

  return (
    <div className="clientes-page app-shell">
      <AppHeader />

      <main>
        <div className="breadcrumb"><Link to="/dashboard">Inicio</Link><span aria-hidden="true">/</span><Link to="/clientes">Ver clientes registrados</Link><span aria-hidden="true">/</span><strong>{editando ? 'Editar cliente' : 'Nuevo registro'}</strong></div>
        <div className="page-heading"><div><div className="eyebrow">GESTIÓN COMERCIAL</div><h1>{titulo}</h1><p>El primer paso para encontrar su próximo vehículo.</p></div><span className="heading-icon" aria-hidden="true"><UserRoundPlus size={30} strokeWidth={1.5} /></span></div>

        <div className="registration-layout">
          <aside className="intro-panel">
            <div className="intro-top"><span className="intro-icon"><UserRoundPlus size={25} /></span><span className="section-number">CLIENTES</span></div>
            <h2>Una atención<br />más cercana.</h2>
            <p>Reúne sus datos de contacto y preferencias para acompañarlo en la búsqueda de su vehículo.</p>
            <div className="intro-divider" />
            <div className="intro-step"><span>01</span><div><strong>Datos de contacto</strong><p>Para mantener la conversación.</p></div></div>
            <div className="intro-step"><span>02</span><div><strong>Preferencias de búsqueda</strong><p>Para conocer lo que necesita.</p></div></div>

          </aside>

          {cargando ? <p className="directory-message" role="status">Cargando cliente…</p> : errorCarga ? <div className="directory-message"><p role="alert">{errorCarga}</p><button className="button-secondary" onClick={() => { setErrorCarga(''); setCargando(true); setRevision(value => value + 1) }}>Reintentar</button><Link to="/clientes">Volver a clientes</Link></div> : <form className="registration-form" ref={formRef} onSubmit={submit} noValidate>
            <section aria-labelledby="contact-heading">
              <div className="section-heading"><span className="step-badge">01</span><div><h2 id="contact-heading">Datos de contacto</h2><p>Completa la información del cliente.</p></div></div>
              <div className="fields">
                <div className="field full"><label htmlFor="nombre">Nombre completo <span>*</span></label><div className={`input-wrap ${errors.nombre ? 'invalid' : ''}`}><UserRound size={18} /><input id="nombre" name="nombre" autoComplete="name" placeholder="Ej. Camila González" value={values.nombre} onChange={update} required maxLength={100} aria-invalid={!!errors.nombre} aria-describedby={errors.nombre ? 'nombre-error' : undefined} /></div>{errors.nombre && <small className="field-error" id="nombre-error">Ingresa el nombre del cliente.</small>}</div>
                <div className="field"><label htmlFor="correo">Correo electrónico <span>*</span></label><div className={`input-wrap ${errors.correo ? 'invalid' : ''}`}><Mail size={18} /><input id="correo" name="correo" type="email" autoComplete="email" placeholder="nombre@correo.cl" value={values.correo} onChange={update} required maxLength={200} aria-invalid={!!errors.correo} aria-describedby={errors.correo ? 'correo-error' : undefined} /></div>{errors.correo && <small className="field-error" id="correo-error">Ingresa un correo válido.</small>}</div>
                <div className="field"><label htmlFor="telefono">Teléfono <span>*</span></label><div className={`input-wrap ${errors.telefono ? 'invalid' : ''}`}><Phone size={18} /><input id="telefono" name="telefono" type="tel" autoComplete="tel" placeholder="+56 9 1234 5678" value={values.telefono} onChange={update} required maxLength={15} aria-invalid={!!errors.telefono} aria-describedby={errors.telefono ? 'telefono-error' : undefined} /></div>{errors.telefono && <small className="field-error" id="telefono-error">Ingresa un teléfono de contacto.</small>}</div>
              </div>
            </section>

            <section className="preferences-section" aria-labelledby="preferences-heading">
              <div className="section-heading"><span className="step-badge">02</span><div><h2 id="preferences-heading">Preferencias de búsqueda</h2><p>¿Qué busca en su próximo vehículo?</p></div></div>
              <div className="field"><label htmlFor="preferencias">Cuéntanos sus preferencias <span>*</span></label><div className={`input-wrap textarea-wrap ${errors.preferencias ? 'invalid' : ''}`}><Search size={18} /><textarea id="preferencias" name="preferencias" rows={4} maxLength={400} placeholder="Ej. Un SUV automático, de uso familiar, con un presupuesto de hasta $15.000.000." value={values.preferencias} onChange={update} required aria-invalid={!!errors.preferencias} aria-describedby={errors.preferencias ? 'preferencias-error' : 'preferences-hint'} /></div>{errors.preferencias ? <small className="field-error" id="preferencias-error">Ingresa las preferencias de búsqueda.</small> : <small id="preferences-hint" className="field-hint">Puedes incluir tipo de vehículo, marca, presupuesto o características.</small>}</div>
            </section>

            <div aria-live="polite" aria-atomic="true">{result && <div className={`feedback ${result}`} role={result === 'error' ? 'alert' : 'status'}>{result === 'success' ? <CheckCircle2 size={21} /> : <CircleAlert size={21} />}<span>{result === 'success' ? (editando ? 'Cambios guardados correctamente.' : 'Ingresado') : 'No fue posible guardar. Revisa los datos e intenta nuevamente.'}</span></div>}</div>
            <div className="form-footer"><span><span className="required-dot">*</span> Todos los campos son obligatorios</span><button type="submit" disabled={enviando}><UserRoundPlus size={18} />{enviando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar cliente'}</button></div>
          </form>}
        </div>
        <footer className="page-footer"><span><Check size={14} /> Registro de clientes · AutoGest Aconcagua</span><span>Gestión comercial</span></footer>
      </main>
    </div>
  )
}
