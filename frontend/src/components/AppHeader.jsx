import { NavLink, Link } from 'react-router-dom';
import { CarFront, LayoutDashboard, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const name = user?.first_name || user?.username || 'Usuario';
  return <header className="app-header">
    <div className="header-inner">
      <Link to="/dashboard" className="brand" aria-label="AutoGest Aconcagua, ir al inicio"><span className="brand-symbol"><CarFront size={25} strokeWidth={1.6} /></span><span>AutoGest<small>ACONCAGUA</small></span></Link>
      <nav className="main-nav" aria-label="Navegación principal">
        <NavLink to="/dashboard"><LayoutDashboard size={17} />Inicio</NavLink>
        <NavLink to="/clientes"><Users size={17} />Clientes</NavLink>
      </nav>
      <div className="account"><span className="avatar" aria-hidden="true">{name.slice(0,2).toUpperCase()}</span><div className="account-name"><strong>{name}</strong><small>{user?.rol}</small></div><button className="logout" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18} /></button></div>
    </div>
  </header>;
}
