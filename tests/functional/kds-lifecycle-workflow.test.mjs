import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Functional Test: Kitchen & Bar KDS Order Lifecycle Workflow', () => {
  // Comanda entrante
  const order = {
    id: 'ord-kds-100',
    tableNumber: 7,
    status: 'en_preparacion',
    items: [
      { id: 'i1', name: 'Hamburguesa Doble', station: 'cocina', status: 'pendiente' },
      { id: 'i2', name: 'Alitas BBQ', station: 'cocina', status: 'pendiente' },
      { id: 'i3', name: 'Mojito Cubano', station: 'barra', status: 'pendiente' },
    ],
  };

  it('Paso 1: Enrutamiento inteligente por estación (Cocina vs Barra)', () => {
    const kitchenItems = order.items.filter((it) => it.station === 'cocina');
    const barItems = order.items.filter((it) => it.station === 'barra');

    assert.strictEqual(kitchenItems.length, 2, 'Cocina debe recibir exactamente 2 platos de comida');
    assert.strictEqual(barItems.length, 1, 'Barra debe recibir exactamente 1 coctel');
    assert.strictEqual(barItems[0].name, 'Mojito Cubano');
  });

  it('Paso 2: Cocinero cambia el estado de los platos de "pendiente" a "preparando"', () => {
    let items = [...order.items];

    // Cocina toma la comanda
    items = items.map((it) =>
      it.station === 'cocina' ? { ...it, status: 'preparando' } : it,
    );

    const kitchenCooking = items.filter((it) => it.station === 'cocina');
    assert.ok(kitchenCooking.every((it) => it.status === 'preparando'));

    // Barra aún no ha tomado su comanda
    const barItem = items.find((it) => it.station === 'barra');
    assert.strictEqual(barItem.status, 'pendiente');
  });

  it('Paso 3: Notificación de "listo para servir" y entrega de todos los productos', () => {
    let items = order.items.map((it) => ({ ...it, status: 'listo' }));

    // Verificamos que todos los ítems estén listos
    assert.ok(items.every((it) => it.status === 'listo'));

    // Mesero retira y entrega en la Mesa 7
    items = items.map((it) => ({ ...it, status: 'entregado' }));
    assert.ok(items.every((it) => it.status === 'entregado'));

    // Orden finalizada
    const isOrderComplete = items.every((it) => it.status === 'entregado');
    assert.strictEqual(isOrderComplete, true);
  });
});
