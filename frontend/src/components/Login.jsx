import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserRound, LockKeyhole, Eye, EyeOff, CarFront, ArrowRight, CircleAlert } from 'lucide-react';
import VehicleIllustration from './VehicleIllustration';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  async function handleLogin(event) {
    event.preventDefault();
    if(pending) return;
    setPending(true); setError('');
    try { await login(email, password); navigate('/dashboard'); }
    catch { setError('Credenciales incorrectas. Verifique e intente nuevamente.'); }
    finally { setPending(false); }
  }
  return <main className="login-screen">
    <section className="login-editorial">
      <div className="brand brand-light"><span className="brand-symbol"><CarFront size={26} strokeWidth={1.5}/></span><span>AutoGest<small>ACONCAGUA</small></span></div>
      <div className="editorial-body"><span className="section-kicker">GESTIÓN AUTOMOTRIZ</span><h1>Tu automotora, conectada.</h1><p>Organiza tu gestión y dedica más tiempo a tus clientes.</p><div className="editorial-rule"/><span className="editorial-caption">Vehículos · Clientes · Oportunidades</span></div>
      <VehicleIllustration />
      <div className="editorial-footer"><span>AutoGest Aconcagua</span><span>Sistema de gestión comercial</span></div>
    </section>
    <section className="login-form-panel" aria-labelledby="login-title">
      <form className="login-card" onSubmit={handleLogin}>
        <span className="login-badge"><LockKeyhole size={17}/>ACCESO AL EQUIPO</span>
        <h2 id="login-title">Inicia sesión</h2><p className="login-description">Ingresa tus credenciales para continuar.</p>
        <div className="input-container"><label htmlFor="login-user">Nombre de usuario</label><div className="login-input"><UserRound size={18}/><input id="login-user" type="text" autoComplete="username" placeholder="Tu usuario" value={email} onChange={e=>setEmail(e.target.value)} required /></div></div>
        <div className="input-container"><label htmlFor="login-password">Contraseña</label><div className="login-input"><LockKeyhole size={18}/><input id="login-password" type={showPass?'text':'password'} autoComplete="current-password" placeholder="Tu contraseña" value={password} onChange={e=>setPassword(e.target.value)} required /><button type="button" className="btn-eye" aria-label={showPass?'Ocultar contraseña':'Mostrar contraseña'} aria-pressed={showPass} onClick={()=>setShowPass(!showPass)}>{showPass?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
        {error && <div className="login-error" role="alert"><CircleAlert size={18}/><span>{error}</span></div>}
        <button type="submit" className="button-primary login-submit" disabled={pending}>{pending?'Ingresando...':'Iniciar sesión'}<ArrowRight size={18}/></button>
        <p className="login-help">Acceso exclusivo para el equipo de la automotora.</p>
      </form>
      <span className="login-footnote">AUTOGEST <span> / </span> ACONCAGUA</span>
    </section>
  </main>;
}
