import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';

const BASE_URL = 'http://localhost:3000';

function getRoute(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, { method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('Integration Tests: Next.js SSR Routing & Slug Resolution', () => {
  it('GET / debe responder 200 con encabezado de Paktak Tech', async () => {
    const res = await getRoute('/');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('Paktak Tech'));
  });

  it('GET /auth/login debe responder 200 con el formulario de ingreso', async () => {
    const res = await getRoute('/auth/login');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('Iniciar sesión'));
  });

  it('GET /restaurante-prueba-a/pedir debe resolver el slug de base de datos y responder 200 OK', async () => {
    const res = await getRoute('/restaurante-prueba-a/pedir');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('Restaurante Prueba A') || res.body.includes('Menú'));
  });

  it('GET /slug-fantasma-inexistente-xyz/pedir debe responder 404 o renderizar boundary de no encontrado', async () => {
    const res = await getRoute('/slug-fantasma-inexistente-xyz/pedir');
    const isNotFound = res.statusCode === 404 || res.body.includes('404') || res.body.includes('could not be found');
    assert.ok(isNotFound, 'Slug inexistente debe devolver status 404 o renderizar boundary de no encontrado');
  });

  it('GET /pedido/consultar debe responder 200 con el buscador de tracking', async () => {
    const res = await getRoute('/pedido/consultar');
    assert.strictEqual(res.statusCode, 200);
  });
});
