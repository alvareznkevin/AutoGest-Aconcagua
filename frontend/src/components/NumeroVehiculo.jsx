import { useLayoutEffect, useRef } from 'react';

function formatearMiles(valor) {
  return String(valor ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function NumeroVehiculo({ value, onChange, name, moneda, ...atributos }) {
  const inputRef = useRef(null);
  const cursorRef = useRef(null);
  useLayoutEffect(() => {
    if (cursorRef.current === null || !inputRef.current) return;
    const input = inputRef.current;
    let posicion = input.value.length;
    let restantes = cursorRef.current;
    while (posicion > 0 && restantes > 0) {
      posicion--;
      if (/\d/.test(input.value[posicion])) restantes--;
    }
    input.setSelectionRange(posicion, posicion);
    cursorRef.current = null;
  });
  return <>
    {moneda && <span aria-hidden="true">$</span>}
    <input {...atributos} ref={inputRef} name={name} type="text" inputMode="numeric" value={formatearMiles(value)} onChange={event => {
      const texto = event.target.value;
      if (!/^[\d.\s$]*$/.test(texto)) return;
      const limpio = texto.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
      if (limpio.length > (moneda ? 12 : 10)) return;
      cursorRef.current = texto.slice(event.target.selectionStart).replace(/\D/g, '').length;
      onChange({ target: { name, value: limpio } });
    }}/>
    {!moneda && <span aria-hidden="true">km</span>}
  </>;
}
