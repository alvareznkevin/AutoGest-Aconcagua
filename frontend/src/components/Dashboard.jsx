import './MejorasInterfaz.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CarFront,
  Users,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';
import AppHeader from './AppHeader';
import IndicadoresDashboard from './IndicadoresDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dashboard-page">
      <AppHeader />

      <main className="workspace">
        <div className="section-kicker">ESPACIO DE TRABAJO</div>

        <section className="dashboard-welcome">
          <div>
            <h1>
              Bienvenido, {user?.first_name || user?.username}.
            </h1>
            <p>
              Todo listo para continuar con la gestión de tu automotora.
            </p>
          </div>
          <span className="workspace-tag">AutoGest Aconcagua</span>
        </section>

        <IndicadoresDashboard />

        <div className="section-caption">
          <h2>Accesos rápidos</h2>
          <span>Selecciona un módulo para comenzar</span>
        </div>

        <div className="module-grid">
          <section className="module-card clients-card">
            <div className="module-top">
              <span className="module-icon">
                <Users size={29} strokeWidth={1.5} />
              </span>
              <span className="module-label">CLIENTES</span>
              <ArrowUpRight size={21} className="module-arrow" />
            </div>

            <h2>
              Clientes y seguimiento
            </h2>

            <p>
              Consulta contactos, preferencias y recomendaciones.
            </p>

            <div className="module-bottom">
              <button
                className="button-secondary"
                onClick={() => navigate('/clientes')}
              >
                Ver clientes
              </button>

              <button
                className="button-primary"
                onClick={() => navigate('/clientes/registrar')}
              >
                Registrar cliente
                <ArrowRight size={17} />
              </button>
            </div>
          </section>

          <section className="module-card inventory-card">
            <div className="module-top">
              <span className="module-icon">
                <CarFront size={29} strokeWidth={1.5} />
              </span>
              <span className="module-label">INVENTARIO</span>
              <ArrowUpRight size={21} className="module-arrow" />
            </div>

            <h2>Inventario de vehículos</h2>

            <p>
              Consulta el stock o incorpora un nuevo vehículo.
            </p>

            <div className="module-bottom">
              <button className="button-secondary" onClick={() => navigate('/vehiculos')}>
                Ver vehículos
              </button>

              <button
                className="button-primary"
                onClick={() => navigate('/vehiculos/registrar')}
              >
                Registrar vehículo
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        </div>


        <footer className="workspace-footer">
          <span>AutoGest Aconcagua</span>
          <span>Gestión de tu automotora</span>
        </footer>
      </main>
    </div>
  );
}
