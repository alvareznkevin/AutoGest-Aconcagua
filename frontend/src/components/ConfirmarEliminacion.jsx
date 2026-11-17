import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
import './MejorasInterfaz.css';

export default function ConfirmarEliminacion({ nombre, tipo, pendiente, error, onCancelar, onConfirmar }) {
  const dialogo = useRef(null);
  const tituloId = useId();
  const descripcionId = useId();
  useEffect(() => {
    const elemento = dialogo.current;
    elemento.showModal();
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { elemento.close(); document.body.style.overflow = previo; };
  }, []);
  return createPortal(<dialog ref={dialogo} className="delete-dialog" aria-labelledby={tituloId} aria-describedby={descripcionId} onCancel={event => { event.preventDefault(); if (!pendiente) onCancelar(); }}>
    <button type="button" className="delete-dialog-close" aria-label="Cerrar confirmación" disabled={pendiente} onClick={onCancelar}><X size={19}/></button>
    <span className="delete-dialog-icon"><Trash2 size={24}/></span><span className="delete-dialog-kicker">CONFIRMAR ELIMINACIÓN</span>
    <h2 id={tituloId}>¿Eliminar {tipo}?</h2><p id={descripcionId}>Vas a eliminar <strong>{nombre}</strong>. Esta acción no se puede deshacer.{tipo === 'vehículo' && ' Los vehículos con movimientos financieros asociados no se pueden eliminar.'}</p>
    {error && <p className="delete-error" role="alert">{error}</p>}
    <div className="delete-dialog-actions"><button autoFocus type="button" className="button-secondary" disabled={pendiente} onClick={onCancelar}>Conservar {tipo}</button><button type="button" className="button-secondary button-danger" disabled={pendiente} onClick={onConfirmar}>{pendiente ? 'Eliminando…' : 'Sí, eliminar'}</button></div>
  </dialog>, document.body);
}
