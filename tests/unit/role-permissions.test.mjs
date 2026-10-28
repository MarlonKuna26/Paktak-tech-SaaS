import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const roleLabelMap = {
  owner: 'Dueño',
  admin: 'Administrador',
  host: 'Anfitrión (Superusuario)',
  cashier: 'Cajero & Servicio',
  kitchen: 'Cocina & Chef',
  waiter: 'Cajero & Servicio',
};

const navigation = [
  { href: '/admin', label: 'Resumen Ejecutivo', roles: ['owner', 'admin', 'host'] },
  { href: '/admin/mesas', label: 'Caja, Salón & Órdenes', roles: ['owner', 'admin', 'host', 'cashier', 'waiter'] },
  { href: '/admin/menu', label: 'Menú & Platos', roles: ['owner', 'admin', 'host'] },
  { href: '/admin/cocina', label: 'KDS Cocina', roles: ['owner', 'admin', 'host', 'kitchen', 'cashier', 'waiter'] },
  { href: '/admin/reservas', label: 'Reservas', roles: ['owner', 'admin', 'host', 'cashier'] },
  { href: '/admin/personal', label: 'Equipo & Personal', roles: ['owner', 'admin', 'host'] },
  { href: '/admin/reportes', label: 'Reportes & Cierre', roles: ['owner', 'admin', 'host', 'cashier'] },
  { href: '/admin/ajustes', label: 'Ajustes', roles: ['owner', 'admin', 'host'] },
];

function getVisibleNav(role) {
  return navigation.filter((item) => item.roles.includes(role));
}

describe('Unit Tests: Role Permissions & Navigation Filter Matrix', () => {
  it('el rol "admin" u "owner" debe tener acceso completo a los 8 módulos del sistema', () => {
    const adminNav = getVisibleNav('admin');
    assert.strictEqual(adminNav.length, 8);
    const ownerNav = getVisibleNav('owner');
    assert.strictEqual(ownerNav.length, 8);
  });

  it('el rol "kitchen" debe tener acceso restringido únicamente a KDS Cocina', () => {
    const kitchenNav = getVisibleNav('kitchen');
    assert.strictEqual(kitchenNav.length, 1);
    assert.strictEqual(kitchenNav[0].href, '/admin/cocina');
    assert.strictEqual(kitchenNav[0].label, 'KDS Cocina');
  });

  it('el rol "waiter" (mesero) debe acceder a Mesas/Salón y KDS Cocina, pero NUNCA a Ajustes ni Personal', () => {
    const waiterNav = getVisibleNav('waiter');
    const hrefs = waiterNav.map((it) => it.href);
    assert.ok(hrefs.includes('/admin/mesas'));
    assert.ok(hrefs.includes('/admin/cocina'));
    assert.ok(!hrefs.includes('/admin/ajustes'), 'El mesero no debe ver Ajustes');
    assert.ok(!hrefs.includes('/admin/personal'), 'El mesero no debe ver Personal');
    assert.ok(!hrefs.includes('/admin/menu'), 'El mesero no debe editar Menú');
  });

  it('el rol "cashier" (cajero) debe poder ver Reportes y Reservas además de Mesas y Cocina', () => {
    const cashierNav = getVisibleNav('cashier');
    const hrefs = cashierNav.map((it) => it.href);
    assert.ok(hrefs.includes('/admin/mesas'));
    assert.ok(hrefs.includes('/admin/cocina'));
    assert.ok(hrefs.includes('/admin/reportes'));
    assert.ok(hrefs.includes('/admin/reservas'));
    assert.ok(!hrefs.includes('/admin/ajustes'), 'El cajero no debe ver Ajustes globales');
  });

  it('debe mapear correctamente las etiquetas de rol humanas', () => {
    assert.strictEqual(roleLabelMap.owner, 'Dueño');
    assert.strictEqual(roleLabelMap.admin, 'Administrador');
    assert.strictEqual(roleLabelMap.kitchen, 'Cocina & Chef');
  });
});
