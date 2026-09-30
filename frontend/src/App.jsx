import { useRef, useState } from 'react'
import { ArrowUpRight, CarFront, Check, CheckCircle2, CircleAlert, Mail, Phone, Search, ShieldCheck, UserRound, UserRoundPlus } from 'lucide-react'
import './App.css'

const initialValues = { nombre: '', correo: '', telefono: '', preferencias: '' }

export default function App() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)
  const formRef = useRef(null)

  function update(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: false }))
    setResult(null)
  }

  function submit(event) {
    event.preventDefault()
    const form = formRef.current
    const nextErrors = Object.fromEntries(
      Object.keys(initialValues).map((name) => [
        name, !values[name].trim() || !form.elements.namedItem(name).validity.valid,
      ]),
    )
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors).find((name) => nextErrors[name])
    if (firstError) {
      setResult('error')
      form.elements.namedItem(firstError).focus()
      return
    }
    // HU-04: simulación visual. Aquí se podrá conectar el registro al backend.
    // No se envían ni persisten datos en esta presentación.
    setResult('success')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><CarFront size={24} strokeWidth={1.8} /></span><span>AutoGest<small>ACONCAGUA</small></span></div>
        <div className="admin"><ShieldCheck size={17} /><span>Administración</span><span className="admin-avatar">AD</span></div>
      </header>

      <main>
        <div className="breadcrumb"><span>Clientes</span><span aria-hidden="true">/</span><strong>Nuevo registro</strong></div>
        <div className="page-heading"><div><div className="eyebrow">GESTIÓN COMERCIAL</div><h1>Registrar cliente</h1><p>El primer paso para encontrar su próximo vehículo.</p></div><span className="heading-icon" aria-hidden="true"><UserRoundPlus size={30} strokeWidth={1.5} /></span></div>

        <div className="registration-layout">
          <aside className="intro-panel">
            <div className="intro-top"><span className="intro-icon"><UserRoundPlus size={25} /></span><span className="section-number">HU–04</span></div>
            <h2>Conoce a tu<br />próximo cliente.</h2>
            <p>Reúne sus datos de contacto y preferencias para acompañarlo en la búsqueda de su vehículo.</p>
            <div className="intro-divider" />
            <div className="intro-step"><span>01</span><div><strong>Datos de contacto</strong><p>Para mantener la conversación.</p></div></div>
            <div className="intro-step"><span>02</span><div><strong>Preferencias de búsqueda</strong><p>Para conocer lo que necesita.</p></div></div>
            <div className="intro-bottom"><CarFront size={21} /><span>Más cerca de su próximo destino.</span><ArrowUpRight size={18} /></div>
          </aside>

          <form className="registration-form" ref={formRef} onSubmit={submit} noValidate>
            <section aria-labelledby="contact-heading">
              <div className="section-heading"><span className="step-badge">01</span><div><h2 id="contact-heading">Datos de contacto</h2><p>Completa la información del cliente.</p></div></div>
              <div className="fields">
                <div className="field full"><label htmlFor="nombre">Nombre completo <span>*</span></label><div className={`input-wrap ${errors.nombre ? 'invalid' : ''}`}><UserRound size={18} /><input id="nombre" name="nombre" autoComplete="name" placeholder="Ej. Camila González" value={values.nombre} onChange={update} required maxLength={120} aria-invalid={!!errors.nombre} aria-describedby={errors.nombre ? 'nombre-error' : undefined} /></div>{errors.nombre && <small className="field-error" id="nombre-error">Ingresa el nombre del cliente.</small>}</div>
                <div className="field"><label htmlFor="correo">Correo electrónico <span>*</span></label><div className={`input-wrap ${errors.correo ? 'invalid' : ''}`}><Mail size={18} /><input id="correo" name="correo" type="email" autoComplete="email" placeholder="nombre@correo.cl" value={values.correo} onChange={update} required maxLength={160} aria-invalid={!!errors.correo} aria-describedby={errors.correo ? 'correo-error' : undefined} /></div>{errors.correo && <small className="field-error" id="correo-error">Ingresa un correo válido.</small>}</div>
                <div className="field"><label htmlFor="telefono">Teléfono <span>*</span></label><div className={`input-wrap ${errors.telefono ? 'invalid' : ''}`}><Phone size={18} /><input id="telefono" name="telefono" type="tel" autoComplete="tel" placeholder="+56 9 1234 5678" value={values.telefono} onChange={update} required maxLength={30} aria-invalid={!!errors.telefono} aria-describedby={errors.telefono ? 'telefono-error' : undefined} /></div>{errors.telefono && <small className="field-error" id="telefono-error">Ingresa un teléfono de contacto.</small>}</div>
              </div>
            </section>

            <section className="preferences-section" aria-labelledby="preferences-heading">
              <div className="section-heading"><span className="step-badge">02</span><div><h2 id="preferences-heading">Preferencias de búsqueda</h2><p>¿Qué busca en su próximo vehículo?</p></div></div>
              <div className="field"><label htmlFor="preferencias">Cuéntanos sus preferencias <span>*</span></label><div className={`input-wrap textarea-wrap ${errors.preferencias ? 'invalid' : ''}`}><Search size={18} /><textarea id="preferencias" name="preferencias" rows={4} maxLength={1500} placeholder="Ej. Un SUV automático, de uso familiar, con un presupuesto de hasta $15.000.000." value={values.preferencias} onChange={update} required aria-invalid={!!errors.preferencias} aria-describedby={errors.preferencias ? 'preferencias-error' : 'preferences-hint'} /></div>{errors.preferencias ? <small className="field-error" id="preferencias-error">Ingresa las preferencias de búsqueda.</small> : <small id="preferences-hint" className="field-hint">Puedes incluir tipo de vehículo, marca, presupuesto o características.</small>}</div>
            </section>

            <div aria-live="polite" aria-atomic="true">{result && <div className={`feedback ${result}`} role={result === 'error' ? 'alert' : 'status'}>{result === 'success' ? <CheckCircle2 size={21} /> : <CircleAlert size={21} />}<span>{result === 'success' ? 'Ingresado' : 'No fue posible ingresar, intentar con otros datos'}</span></div>}</div>
            <div className="form-footer"><span><span className="required-dot">*</span> Todos los campos son obligatorios</span><button type="submit"><UserRoundPlus size={18} />Registrar cliente</button></div>
          </form>
        </div>
        <footer className="page-footer"><span><Check size={14} /> Registro de clientes · AutoGest Aconcagua</span><span>Vista de presentación · Sin conexión al servidor</span></footer>
      </main>
    </div>
  )
}
