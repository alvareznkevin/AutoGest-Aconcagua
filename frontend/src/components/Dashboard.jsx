import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Car, Users, LogOut, LayoutDashboard } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <nav className="nav">
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: 'var(--dark)'}}>
          <LayoutDashboard color="var(--primary)" /> AutoGest Aconcagua
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <span className="role-badge">{user?.rol}</span>
          <span style={{fontSize: '0.9rem'}}>Hola, <strong>{user?.first_name || user?.username}</strong></span>
          <button onClick={logout} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px'}}>
            <LogOut size={18} /> Salir
          </button>
        </div>
      </nav>

      <div className="dashboard-grid">
        <div className="card">
          <Car size={40} color="var(--primary)" />
          <h3>Inventario Vehicular</h3>
          <p>Módulo para la carga de stock, fotografías y detalles técnicos.</p>
          <button className="btn-login" style={{marginTop: '20px', padding: '10px'}}>Acceder</button>
        </div>
        <div className="card">
          <Users size={40} color="var(--primary)" />
          <h3>Gestión de Clientes</h3>
          <p>Registro de prospectos, financiamiento y seguimiento de ventas.</p>
          <button className="btn-login" style={{marginTop: '20px', padding: '10px'}}>Acceder</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;