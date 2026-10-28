import { z } from 'zod';

export const publicOrderSchema = z.object({
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

export type PublicOrderInput = z.infer<typeof publicOrderSchema>;
