import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escalaVentas } from '../src/components/escalaVentas.js';
test('las pérdidas quedan bajo cero y los márgenes positivos arriba', () => {
  const e = escalaVentas([{ margen: -1000000 }, { margen: 1500000 }], 'margen');
  assert.ok(e.y(-1000000) > e.cero);
  assert.ok(e.y(1500000) < e.cero);
  assert.ok(e.ticks.includes(0));
  assert.ok(e.ticks[0] <= -1000000);
  assert.ok(e.ticks.at(-1) >= 1500000);
});
test('cantidad y dinero usan ejes enteros y admiten meses vacíos', () => {
  for (const campo of ['ventas', 'margen']) {
    for (const valores of [[], [{ [campo]: 0 }], [{ [campo]: 1 }], [{ [campo]: -1 }]]) {
      const e = escalaVentas(valores,campo);
      assert.ok(Number.isFinite(e.cero));
      assert.ok(e.ticks.every(Number.isInteger));
      assert.ok(e.ticks.includes(0));
    }
  }
});
