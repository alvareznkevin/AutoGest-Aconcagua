import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CarFront, Users, ArrowUpRight, ArrowRight, LockKeyhole } from 'lucide-react';
import AppHeader from './AppHeader';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return <div className="dashboard-page">
    <AppHeader />
    <main className="workspace">
      <div className="section-kicker">ESPACIO DE TRABAJO</div>
      <section className="dashboard-welcome"><div><h1>Bienvenido, {user?.first_name || user?.username}.</h1><p>Todo listo para continuar con la gestión de tu automotora.</p></div><span className="workspace-tag">AutoGest Aconcagua</span></section>
      <div className="section-caption"><h2>Gestión del negocio</h2><span>Selecciona un módulo para comenzar</span></div>
      <div className="module-grid">
        <section className="module-card clients-card"><div className="module-top"><span className="module-icon"><Users size={29} strokeWidth={1.5}/></span><span className="module-label">CLIENTES</span><ArrowUpRight size={21} className="module-arrow" /></div><h2>Relaciones que comienzan<br />con una conversación.</h2><p>Registra los datos de contacto y las preferencias de quienes buscan su próximo vehículo.</p><div className="module-bottom"><button className="button-secondary" onClick={()=>navigate('/clientes')}>Ver clientes</button><button className="button-primary" onClick={()=>navigate('/clientes/registrar')}>Registrar cliente<ArrowRight size={17}/></button></div></section>
        <section className="module-card inventory-card"><div className="module-top"><span className="module-icon"><CarFront size={29} strokeWidth={1.5}/></span><span className="module-label">INVENTARIO</span><span className="coming-label">Próximamente</span></div><h2>Inventario de vehículos</h2><p>Un espacio para organizar vehículos, fotografías y sus características técnicas.</p><div className="module-bottom"><span>Inventario vehicular</span><button className="button-secondary" disabled><LockKeyhole size={16}/>No disponible</button></div></section>
      </div>
      <footer className="workspace-footer"><span>AutoGest Aconcagua</span><span>Gestión de tu automotora</span></footer>
    </main>
  </div>;
}
