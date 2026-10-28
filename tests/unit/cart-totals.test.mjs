import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Cart management logic implemented in PublicOrderForm and CartDrawer
 */
function calculateCartTotals(cart) {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCents = cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  const formattedTotal = (totalCents / 100).toFixed(2);
  return { totalCount, totalCents, formattedTotal };
}

function addToCart(currentCart, product, quantity, notes = '') {
  const existingIndex = currentCart.findIndex(
    (it) => it.id === product.id && (it.notes || '') === notes,
  );

  if (existingIndex > -1) {
    return currentCart.map((it, idx) =>
      idx === existingIndex
        ? { ...it, quantity: Math.min(it.quantity + quantity, 99) }
        : it,
    );
  }

  return [...currentCart, { ...product, quantity, notes }];
}

function updateQuantity(currentCart, productId, newQty) {
  if (newQty < 1) {
    return currentCart.filter((it) => it.id !== productId);
  }
  return currentCart.map((it) => (it.id === productId ? { ...it, quantity: newQty } : it));
}

describe('Unit Tests: Cart Totals & Precision Math', () => {
  const burger = { id: 'p1', name: 'Hamburguesa Doble', price_cents: 950 }; // $9.50
  const ceviche = { id: 'p2', name: 'Ceviche Clásico', price_cents: 850 }; // $8.50
  const cerveza = { id: 'p3', name: 'Cerveza IPA', price_cents: 450 }; // $4.50

  it('debe calcular $0.00 para un carrito vacío', () => {
    const totals = calculateCartTotals([]);
    assert.strictEqual(totals.totalCount, 0);
    assert.strictEqual(totals.totalCents, 0);
    assert.strictEqual(totals.formattedTotal, '0.00');
  });

  it('debe calcular correctamente el subtotal en centavos evitando errores de punto flotante de JS', () => {
    // 3 items a $4.50 + 2 items a $8.50 + 1 item a $9.50
    // (3 * 450) + (2 * 850) + (1 * 950) = 1350 + 1700 + 950 = 4000 cents ($40.00)
    let cart = [];
    cart = addToCart(cart, cerveza, 3);
    cart = addToCart(cart, ceviche, 2);
    cart = addToCart(cart, burger, 1);

    const totals = calculateCartTotals(cart);
    assert.strictEqual(totals.totalCount, 6);
    assert.strictEqual(totals.totalCents, 4000);
    assert.strictEqual(totals.formattedTotal, '40.00');
  });

  it('debe diferenciar ítems del mismo producto si tienen notas distintas', () => {
    let cart = [];
    cart = addToCart(cart, burger, 1, 'Sin cebolla');
    cart = addToCart(cart, burger, 2, 'Con queso extra');

    assert.strictEqual(cart.length, 2, 'Deben existir 2 líneas separadas en el carrito');
    assert.strictEqual(cart[0].notes, 'Sin cebolla');
    assert.strictEqual(cart[0].quantity, 1);
    assert.strictEqual(cart[1].notes, 'Con queso extra');
    assert.strictEqual(cart[1].quantity, 2);

    const totals = calculateCartTotals(cart);
    assert.strictEqual(totals.totalCount, 3);
    assert.strictEqual(totals.totalCents, 2850); // 3 * 950 = 2850 ($28.50)
  });

  it('debe incrementar cantidad cuando el producto y las notas coinciden exactamente', () => {
    let cart = [];
    cart = addToCart(cart, burger, 1, 'Papas crocantes');
    cart = addToCart(cart, burger, 2, 'Papas crocantes');

    assert.strictEqual(cart.length, 1);
    assert.strictEqual(cart[0].quantity, 3);
  });

  it('debe eliminar el producto del carrito cuando la cantidad desciende a 0', () => {
    let cart = [{ ...burger, quantity: 1, notes: '' }];
    cart = updateQuantity(cart, burger.id, 0);
    assert.strictEqual(cart.length, 0);
  });

  it('debe respetar el límite máximo de 99 unidades por producto', () => {
    let cart = [{ ...burger, quantity: 95, notes: '' }];
    cart = addToCart(cart, burger, 10, '');
    assert.strictEqual(cart[0].quantity, 99);
  });
});
