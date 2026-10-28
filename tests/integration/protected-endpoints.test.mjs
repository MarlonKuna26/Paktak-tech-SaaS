import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';

const BASE_URL = 'http://localhost:3000';

function getRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, {
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function postRequest(path, body = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Integration Tests: Protected API Security & Route Guards', () => {
  it('GET /api/reports/daily debe rechazar solicitudes anónimas sin sesión (401/403/307)', async () => {
    const res = await getRequest('/api/reports/daily');
    assert.ok(
      [401, 403, 307, 308].includes(res.statusCode),
      `Se esperaba 401, 403 o 307 pero devolvió ${res.statusCode}`,
    );
  });

  it('GET /api/staff debe rechazar solicitudes anónimas sin sesión', async () => {
    const res = await getRequest('/api/staff');
    assert.ok(
      [401, 403, 307, 308].includes(res.statusCode),
      `Se esperaba rechazo pero devolvió ${res.statusCode}`,
    );
  });

  it('GET /api/tables debe rechazar solicitudes anónimas sin sesión', async () => {
    const res = await getRequest('/api/tables');
    assert.ok(
      [401, 403, 307, 308].includes(res.statusCode),
      `Se esperaba rechazo pero devolvió ${res.statusCode}`,
    );
  });

  it('POST /api/orders/xyz-order-id/checkout debe rechazar cobros sin sesión de cajero (401/403)', async () => {
    const res = await postRequest('/api/orders/a0000000-0000-0000-0000-000000000001/checkout', {
      paymentMethod: 'efectivo',
      paidCents: 1000,
    });
    assert.ok(
      [401, 403, 307, 308].includes(res.statusCode),
      `Se esperaba rechazo no autorizado pero devolvió ${res.statusCode}`,
    );
  });
});
