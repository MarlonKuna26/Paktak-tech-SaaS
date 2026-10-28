import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function calculateCheckoutBreakdown({ subtotalCents, tipPercent = 0, customTipCents = 0, paidCents = 0 }) {
  const calculatedTip = tipPercent > 0 ? Math.round((subtotalCents * tipPercent) / 100) : customTipCents;
  const grandTotalCents = subtotalCents + calculatedTip;
  const changeCents = Math.max(0, paidCents - grandTotalCents);
  const isFullyPaid = paidCents >= grandTotalCents;

  return {
    subtotal: (subtotalCents / 100).toFixed(2),
    tip: (calculatedTip / 100).toFixed(2),
    grandTotal: (grandTotalCents / 100).toFixed(2),
    paid: (paidCents / 100).toFixed(2),
    change: (changeCents / 100).toFixed(2),
    isFullyPaid,
    grandTotalCents,
    changeCents,
  };
}

describe('Unit Tests: Table Billing & Cash Register Calculations', () => {
  it('debe calcular propina del 10% y total exacto', () => {
    // Cuenta de $50.00 con 10% de propina = $5.00 -> Total $55.00
    const res = calculateCheckoutBreakdown({
      subtotalCents: 5000,
      tipPercent: 10,
      paidCents: 6000, // paga con billete de $60 o 3 de 20
    });

    assert.strictEqual(res.subtotal, '50.00');
    assert.strictEqual(res.tip, '5.00');
    assert.strictEqual(res.grandTotal, '55.00');
    assert.strictEqual(res.change, '5.00');
    assert.strictEqual(res.isFullyPaid, true);
  });

  it('debe redondear adecuadamente centavos impares en cálculo de propina porcentual', () => {
    // Cuenta de $33.33 (3333 centavos) con 10% = 333.3 -> 333 centavos ($3.33)
    const res = calculateCheckoutBreakdown({
      subtotalCents: 3333,
      tipPercent: 10,
      paidCents: 4000,
    });

    assert.strictEqual(res.tip, '3.33');
    assert.strictEqual(res.grandTotal, '36.66');
    assert.strictEqual(res.change, '3.34');
    assert.strictEqual(res.isFullyPaid, true);
  });

  it('debe advertir si el monto entregado en efectivo es inferior al total', () => {
    const res = calculateCheckoutBreakdown({
      subtotalCents: 2000, // $20.00
      tipPercent: 0,
      paidCents: 1500, // paga $15.00 (faltan $5)
    });

    assert.strictEqual(res.isFullyPaid, false);
    assert.strictEqual(res.change, '0.00');
  });

  it('debe procesar propina personalizada fija en centavos', () => {
    const res = calculateCheckoutBreakdown({
      subtotalCents: 4500, // $45.00
      customTipCents: 500, // $5.00
      paidCents: 5000,     // $50.00
    });

    assert.strictEqual(res.grandTotal, '50.00');
    assert.strictEqual(res.change, '0.00');
    assert.strictEqual(res.isFullyPaid, true);
  });
});
