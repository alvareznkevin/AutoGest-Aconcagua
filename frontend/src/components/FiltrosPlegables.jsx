import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import './MejorasInterfaz.css';
export default function FiltrosPlegables({ cantidad, children }) {
  return <details className="collapsible-filters"><summary><span><SlidersHorizontal size={17}/>Filtros<span className={cantidad ? 'filter-count active' : 'filter-count'}>{cantidad ? `${cantidad} activos` : 'Sin filtros activos'}</span></span><ChevronDown size={17} className="filter-chevron"/></summary><div className="collapsible-filter-content">{children}</div></details>;
}
