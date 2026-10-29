import test from 'node:test';
import assert from 'node:assert/strict';

function calculateShiftClosingMath({
  initialCashCents,
  cashSalesCents,
  countedCashCents,
  leftForNextShiftCents,
}) {
  const expectedCashCents = initialCashCents + cashSalesCents;
  const discrepancyCents = countedCashCents - expectedCashCents;

  let balanceStatus = 'cuadrada';
  if (discrepancyCents > 0) balanceStatus = 'sobrante';
  else if (discrepancyCents < 0) balanceStatus = 'faltante';

  const withdrawnCents = Math.max(0, countedCashCents - leftForNextShiftCents);

  return {
    expectedCashCents,
    discrepancyCents,
    balanceStatus,
    withdrawnCents,
  };
}

test('Unit Tests: Cash Shifts & Drawer Balance Math', async (t) => {
  await t.test('debe cuadrar exactamente cuando el efectivo contado coincide con fondo inicial + ventas', () => {
    const result = calculateShiftClosingMath({
      initialCashCents: 5000, // $50.00 fondo inicial
      cashSalesCents: 12550,  // $125.50 ventas en efectivo
      countedCashCents: 17550, // $175.50 contado en gaveta
      leftForNextShiftCents: 5000, // deja $50.00 para la cajera de la tarde
    });

    assert.equal(result.expectedCashCents, 17550);
    assert.equal(result.discrepancyCents, 0);
    assert.equal(result.balanceStatus, 'cuadrada');
    assert.equal(result.withdrawnCents, 12550); // $125.50 a depositar/guardar
  });

  await t.test('debe detectar faltante si hay menos dinero que lo esperado', () => {
    const result = calculateShiftClosingMath({
      initialCashCents: 5000,
      cashSalesCents: 10000,
      countedCashCents: 14500, // Faltan $5.00
      leftForNextShiftCents: 5000,
    });

    assert.equal(result.expectedCashCents, 15000);
    assert.equal(result.discrepancyCents, -500);
    assert.equal(result.balanceStatus, 'faltante');
  });

  await t.test('debe detectar sobrante si hay más dinero en gaveta', () => {
    const result = calculateShiftClosingMath({
      initialCashCents: 5000,
      cashSalesCents: 8000,
      countedCashCents: 13200, // Sobran $2.00
      leftForNextShiftCents: 5000,
    });

    assert.equal(result.expectedCashCents, 13000);
    assert.equal(result.discrepancyCents, 200);
    assert.equal(result.balanceStatus, 'sobrante');
  });

  await t.test('debe calcular correctamente el dinero que se deja para el turno de la tarde y el monto retirado', () => {
    const result = calculateShiftClosingMath({
      initialCashCents: 5000,
      cashSalesCents: 20000,
      countedCashCents: 25000, // $250.00 total
      leftForNextShiftCents: 6000, // Deja $60.00 para el turno de la tarde
    });

    assert.equal(result.withdrawnCents, 19000); // Se retiran $190.00
  });
});
