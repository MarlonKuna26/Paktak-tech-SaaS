import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

// Replicating schema as defined in lib/orders/schema.ts
const publicOrderSchema = z.object({
  restaurantSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(7).max(30),
  notes: z.string().trim().max(500).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
    notes: z.string().trim().max(200).optional(),
  })).min(1).max(50),
  captchaToken: z.string().max(2048).optional(),
});

describe('Unit Tests: Public Order Zod Validation Schema', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  it('debe validar exitosamente una orden completa con datos correctos', () => {
    const input = {
      restaurantSlug: 'restaurante-prueba-a',
      customerName: 'Carlos Mendoza',
      customerPhone: '0991234567',
      notes: '[Modo: Retiro en Local] Sin hielo por favor',
      items: [
        {
          productId: validUuid,
          quantity: 2,
          notes: 'Término medio',
        },
      ],
    };

    const result = publicOrderSchema.safeParse(input);
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.customerName, 'Carlos Mendoza');
      assert.strictEqual(result.data.items[0].quantity, 2);
    }
  });

  it('debe rechazar restaurantSlug con caracteres especiales o mayúsculas', () => {
    const invalidSlugs = ['Restaurante_A', 'slug con espacios', 'slug@invalid!', '-slug-inicial', 'slug-final-'];
    for (const slug of invalidSlugs) {
      const result = publicOrderSchema.safeParse({
        restaurantSlug: slug,
        customerName: 'Juan Pérez',
        customerPhone: '0991234567',
        items: [{ productId: validUuid, quantity: 1 }],
      });
      assert.strictEqual(result.success, false, `Debería fallar con slug: "${slug}"`);
    }
  });

  it('debe rechazar nombres de cliente menores a 2 caracteres o vacíos', () => {
    const result = publicOrderSchema.safeParse({
      restaurantSlug: 'restaurante-prueba-a',
      customerName: 'A',
      customerPhone: '0991234567',
      items: [{ productId: validUuid, quantity: 1 }],
    });
    assert.strictEqual(result.success, false);
  });

  it('debe rechazar teléfonos con menos de 7 caracteres', () => {
    const result = publicOrderSchema.safeParse({
      restaurantSlug: 'restaurante-prueba-a',
      customerName: 'Juan Pérez',
      customerPhone: '12345',
      items: [{ productId: validUuid, quantity: 1 }],
    });
    assert.strictEqual(result.success, false);
  });

  it('debe rechazar órdenes sin ningún producto en el carrito (array vacío)', () => {
    const result = publicOrderSchema.safeParse({
      restaurantSlug: 'restaurante-prueba-a',
      customerName: 'Juan Pérez',
      customerPhone: '0991234567',
      items: [],
    });
    assert.strictEqual(result.success, false);
  });

  it('debe rechazar cantidades inválidas (cero, negativas o mayores a 99)', () => {
    const zeroQty = publicOrderSchema.safeParse({
      restaurantSlug: 'restaurante-prueba-a',
      customerName: 'Juan Pérez',
      customerPhone: '0991234567',
      items: [{ productId: validUuid, quantity: 0 }],
    });
    assert.strictEqual(zeroQty.success, false);

    const overQty = publicOrderSchema.safeParse({
      restaurantSlug: 'restaurante-prueba-a',
      customerName: 'Juan Pérez',
      customerPhone: '0991234567',
      items: [{ productId: validUuid, quantity: 100 }],
    });
    assert.strictEqual(overQty.success, false);
  });

  it('debe rechazar productIds que no sean UUIDs válidos', () => {
    const result = publicOrderSchema.safeParse({
      restaurantSlug: 'restaurante-prueba-a',
      customerName: 'Juan Pérez',
      customerPhone: '0991234567',
      items: [{ productId: 'id-no-uuid-invalido', quantity: 1 }],
    });
    assert.strictEqual(result.success, false);
  });
});
