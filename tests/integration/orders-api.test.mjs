import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';

const BASE_URL = 'http://localhost:3000';

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* ignore */ }
        resolve({ statusCode: res.statusCode, data: json, rawBody: data });
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Integration Tests: /api/orders Endpoint', () => {
  it('debe responder 400 cuando se envía un cuerpo vacío ({})', async () => {
    const res = await postJson('/api/orders', {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.data?.error || res.data?.message, 'Debe devolver mensaje explicativo de error');
  });

  it('debe responder 400 cuando el nombre del cliente es menor a 2 caracteres', async () => {
    const res = await postJson('/api/orders', {
      restaurantSlug: 'restaurante-prueba-a',
      customerName: 'A',
      customerPhone: '0991234567',
      items: [{ productId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('debe responder 400 cuando la lista de items está vacía', async () => {
    const res = await postJson('/api/orders', {
      restaurantSlug: 'restaurante-prueba-a',
      customerName: 'María López',
      customerPhone: '0991234567',
      items: [],
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('debe responder 400 cuando el teléfono es demasiado corto (< 7 dígitos)', async () => {
    const res = await postJson('/api/orders', {
      restaurantSlug: 'restaurante-prueba-a',
      customerName: 'María López',
      customerPhone: '123',
      items: [{ productId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('debe rechazar pedidos para un restaurante inexistente con mensaje controlado', async () => {
    const res = await postJson('/api/orders', {
      restaurantSlug: 'slug-inexistente-xyz-999',
      customerName: 'Cliente Prueba',
      customerPhone: '0991234567',
      items: [{ productId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
    });
    // Debe responder 400 o 404 (Restaurante no encontrado o inactivo)
    assert.ok(res.statusCode === 400 || res.statusCode === 404);
    assert.ok(res.data?.error, 'Debe indicar que el restaurante no fue encontrado');
  });
});
