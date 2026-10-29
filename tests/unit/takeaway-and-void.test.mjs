import test from 'node:test';
import assert from 'node:assert/strict';

function recalculateBillAfterVoidingItem(items, itemIdToVoid) {
  const updatedItems = items.filter((it) => it.id !== itemIdToVoid);
  const newSubtotalCents = updatedItems.reduce((acc, it) => acc + it.unitPriceCents * it.quantity, 0);
  return {
    updatedItems,
    newSubtotalCents,
  };
}

function calculateTakeawayOrderTotal(items) {
  return items.reduce((acc, it) => acc + it.priceCents * it.quantity, 0);
}

test('Unit Tests: Voiding Unserved Dishes and Takeaway Billing', async (t) => {
  await t.test('debe anular un plato no servido y descontarlo del total exacto', () => {
    const originalItems = [
      { id: 'item-1', productName: 'Ceviche Mixto', quantity: 2, unitPriceCents: 850 }, // $17.00
      { id: 'item-2', productName: 'Jugo Natural', quantity: 1, unitPriceCents: 200 },   // $2.00
      { id: 'item-3', productName: 'Postre Tres Leches', quantity: 1, unitPriceCents: 350 }, // $3.50
    ];

    // El cliente cancela el postre porque no se va a servir
    const result = recalculateBillAfterVoidingItem(originalItems, 'item-3');

    assert.equal(result.updatedItems.length, 2);
    assert.equal(result.newSubtotalCents, 1900); // $19.00 ($17.00 + $2.00)
    assert.equal(result.updatedItems.some((it) => it.id === 'item-3'), false);
  });

  await t.test('debe calcular el total de un pedido para llevar en mostrador', () => {
    const takeawayItems = [
      { productId: 'p1', name: 'Chaulafán Especial', priceCents: 650, quantity: 2 }, // $13.00
      { productId: 'p2', name: 'Gaseosa 500ml', priceCents: 150, quantity: 2 },       // $3.00
    ];

    const totalCents = calculateTakeawayOrderTotal(takeawayItems);
    assert.equal(totalCents, 1600); // $16.00
  });

  await t.test('debe calcular el vuelto correcto para pago en efectivo de pedido para llevar', () => {
    const totalCents = 1600; // $16.00
    const cashGivenCents = 2000; // billete de $20.00
    const changeCents = Math.max(0, cashGivenCents - totalCents);

    assert.equal(changeCents, 400); // $4.00 de vuelto
  });
});

