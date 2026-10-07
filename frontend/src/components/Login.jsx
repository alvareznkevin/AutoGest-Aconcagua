import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Car, Users, BarChart3, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales incorrectas. Verifique e intente nuevamente.');
    }
  };

  return (
    <div className="login-screen">
      <div className="panel-info">
        <h1>AutoGest Aconcagua</h1>
        <p style={{fontSize: '1.2rem', opacity: 0.8, marginBottom: '50px'}}>Sistema de Gestión Comercial e Inventario</p>
        
        <div className="feature-item">
          <div className="icon-box"><Car size={24} color="#0088ea" /></div>
          <div><strong>Vehículos</strong><br/><small>Controla tu inventario en tiempo real</small></div>
        </div>
        <div className="feature-item">
          <div className="icon-box"><Users size={24} color="#0088ea" /></div>
          <div><strong>Clientes</strong><br/><small>Gestiona oportunidades y ventas</small></div>
        </div>
        <div className="feature-item">
          <div className="icon-box"><BarChart3 size={24} color="#0088ea" /></div>
          <div><strong>Resultados</strong><br/><small>Analiza el crecimiento de tu negocio</small></div>
        </div>
      </div>

      <div className="panel-form">
        <form className="login-card" onSubmit={handleLogin}>
          <h2 style={{fontSize: '2rem', marginBottom: '10px'}}>Bienvenido</h2>
          <p style={{color: '#64748b', marginBottom: '30px'}}>Inicia sesión con tus credenciales</p>
          
          {error && <div style={{background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.8rem'}}>{error}</div>}

          <div className="input-container">
            <label>Correo Electrónico / Usuario</label>
            <Mail className="icon-input" size={20} />
            <input type="text" placeholder="ejemplo@automotora.cl" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="input-container">
            <label>Contraseña</label>
            <Lock className="icon-input" size={20} />
            <input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="btn-eye" onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button type="submit" className="btn-login">
            Iniciar Sesión <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;