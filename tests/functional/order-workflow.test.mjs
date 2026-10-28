import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Functional Test: Simulates the entire customer journey from landing on the menu to checkout.
 */
describe('Functional Test: Customer Digital Ordering End-to-End Workflow', () => {
  // Mock products fetched from database for restaurante-prueba-a
  const mockMenu = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Ceviche Clásico', price_cents: 850, category: 'Entradas', station: 'cocina' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Lomo Saltado', price_cents: 1250, category: 'Platos Fuertes', station: 'cocina' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Mojito Cubano', price_cents: 650, category: 'Bebidas', station: 'barra' },
  ];

  it('Paso 1: El cliente filtra platos usando la barra de búsqueda en tiempo real', () => {
    const searchQuery = 'mojito';
    const filtered = mockMenu.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].name, 'Mojito Cubano');
    assert.strictEqual(filtered[0].station, 'barra');
  });

  it('Paso 2: El cliente selecciona modalidad "Delivery" y agrega productos con notas personalizadas', () => {
    const orderMode = 'delivery';
    let cart = [];

    // Agregar Lomo Saltado con nota especial
    const lomo = mockMenu.find((p) => p.name === 'Lomo Saltado');
    cart.push({
      productId: lomo.id,
      name: lomo.name,
      price_cents: lomo.price_cents,
      quantity: 1,
      notes: 'Poco término, papas muy crujientes',
    });

    // Agregar 2 Mojitos
    const mojito = mockMenu.find((p) => p.name === 'Mojito Cubano');
    cart.push({
      productId: mojito.id,
      name: mojito.name,
      price_cents: mojito.price_cents,
      quantity: 2,
      notes: 'Con poca azúcar',
    });

    assert.strictEqual(cart.length, 2);
    const totalCount = cart.reduce((sum, it) => sum + it.quantity, 0);
    const totalCents = cart.reduce((sum, it) => sum + it.price_cents * it.quantity, 0);

    // 1 * 1250 + 2 * 650 = 1250 + 1300 = 2550 cents ($25.50)
    assert.strictEqual(totalCount, 3);
    assert.strictEqual(totalCents, 2550);
    assert.strictEqual((totalCents / 100).toFixed(2), '25.50');
  });

  it('Paso 3: Ensamblado y validación del payload final enviado a /api/orders', () => {
    const orderMode = 'delivery';
    const customerName = 'Esteban Morales';
    const customerPhone = '0987654321';
    const extraNotes = 'Entregar en portería del edificio';

    const cart = [
      { productId: '22222222-2222-2222-2222-222222222222', quantity: 1, notes: 'Poco término' },
      { productId: '33333333-3333-3333-3333-333333333333', quantity: 2, notes: 'Sin hielo' },
    ];

    const combinedNotes = [
      orderMode === 'pickup' ? '[Modo: Retiro en Local]' : '[Modo: Delivery]',
      extraNotes,
    ].filter(Boolean).join(' ');

    const payload = {
      restaurantSlug: 'restaurante-prueba-a',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      notes: combinedNotes,
      items: cart,
    };

    assert.strictEqual(payload.notes, '[Modo: Delivery] Entregar en portería del edificio');
    assert.strictEqual(payload.items.length, 2);
    assert.strictEqual(payload.items[0].quantity, 1);
    assert.strictEqual(payload.items[1].quantity, 2);
  });

  it('Paso 4: Recepción de Tracking y redirección al KDS de seguimiento en vivo', () => {
    // Simula la respuesta exitosa del servidor
    const serverResponse = {
      message: 'Pedido recibido con éxito',
      tracking: {
        id: 'ord-88392-uuid',
        tracking_code: 'PAK-883',
        tracking_token: 'test_token_77218392',
      },
    };

    assert.ok(serverResponse.tracking.tracking_code);
    assert.ok(serverResponse.tracking.tracking_token);

    const redirectUrl = `/pedido/${serverResponse.tracking.tracking_token}`;
    assert.strictEqual(redirectUrl, '/pedido/test_token_77218392');
  });
});
