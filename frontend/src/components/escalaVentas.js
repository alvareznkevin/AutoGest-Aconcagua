export function escalaVentas(serie, campo) {
  const valores = serie.map(mes => Number(mes[campo]) || 0);
  const menor = Math.min(0, ...valores);
  const mayor = Math.max(0, ...valores);
  const rango = mayor - menor || 1;
  const aproximado = rango / 4;
  const potencia = 10 ** Math.floor(Math.log10(aproximado));
  const pasoBase = Math.ceil(aproximado / potencia) * potencia;
  const paso = Math.max(1, Math.ceil(pasoBase));
  const inferior = Math.floor(menor / paso) * paso;
  let superior = Math.ceil(mayor / paso) * paso;
  if (superior === inferior) superior = inferior + paso;
  const ticks = Array.from({ length: Math.round((superior - inferior) / paso) + 1 }, (_, i) => inferior + i * paso);
  const y = valor => 215 - (valor - inferior) / (superior - inferior) * 180;
  return { ticks, y, cero: y(0) };
}
