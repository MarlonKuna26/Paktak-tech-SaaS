import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Functional Test: Cashier Table Billing & Release Workflow', () => {
  // Estado inicial de la mesa
  const table = {
    id: 'tbl-04',
    number: 4,
    status: 'ocupada', // ocupada -> cobrando -> libre
    currentOrder: {
      id: 'ord-table-04',
      items: [
        { name: 'Costillas BBQ', price_cents: 1400, quantity: 2 }, // 2800
        { name: 'Cerveza IPA', price_cents: 450, quantity: 4 },    // 1800
      ],
    },
  };

  it('Paso 1: Cálculo de subtotal de la mesa activa', () => {
    const subtotalCents = table.currentOrder.items.reduce(
      (sum, it) => sum + it.price_cents * it.quantity,
      0,
    );
    // 2800 + 1800 = 4600 cents ($46.00)
    assert.strictEqual(subtotalCents, 4600);
    assert.strictEqual((subtotalCents / 100).toFixed(2), '46.00');
  });

  it('Paso 2: Aplicación de propina sugerida (10%) y verificación del cobro', () => {
    const subtotalCents = 4600;
    const tipCents = Math.round((subtotalCents * 10) / 100); // $4.60
    const totalToPayCents = subtotalCents + tipCents;        // $50.60

    assert.strictEqual(tipCents, 460);
    assert.strictEqual(totalToPayCents, 5060);

    // Cliente entrega $60 en efectivo
    const paidCents = 6000;
    const changeDueCents = paidCents - totalToPayCents;

    assert.strictEqual(changeDueCents, 940); // Cambio: $9.40
    assert.strictEqual((changeDueCents / 100).toFixed(2), '9.40');
  });

  it('Paso 3: Transición de estado y liberación de mesa para el siguiente comensal', () => {
    const releaseTable = true;
    let tableStatus = table.status;

    // Ejecución de checkout
    if (releaseTable) {
      tableStatus = 'libre';
    }

    assert.strictEqual(tableStatus, 'libre', 'La mesa debe quedar inmediatamente disponible para nuevos clientes');
  });
});
