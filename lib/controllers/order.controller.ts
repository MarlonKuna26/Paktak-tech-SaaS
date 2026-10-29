import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { OrderModel } from '@/lib/models/order.model';

const checkoutSchema = z.object({
  paymentMethod: z.enum(['efectivo', 'transferencia', 'tarjeta', 'otro']),
  tipCents: z.number().int().nonnegative().default(0),
  paidCents: z.number().int().nonnegative().default(0),
  releaseTable: z.boolean().default(true),
});

const paymentSchema = z.object({
  paymentMethod: z.enum(['efectivo', 'transferencia', 'tarjeta', 'otro']),
  paidAmountCents: z.number().int().nonnegative(),
  tokenNumber: z.string().trim().max(50).optional().nullable(),
  serviceType: z.enum(['paleta_madera', 'mesa_fija', 'para_llevar']).default('paleta_madera'),
});

const kdsStatusSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
  status: z.enum(['pendiente', 'preparando', 'listo', 'entregado']).optional(),
  nextStatus: z.enum(['pendiente', 'preparando', 'listo', 'entregado']).optional(),
});

export class OrderController {
  /**
   * POST /api/orders/[id]/checkout
   */
  static async checkout(
    request: Request,
    props: { params: Promise<{ id: string }> },
  ) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await props.params;
    const json = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de cobro inválidos', issues: parsed.error.issues },
        { status: 400 },
      );
    }

    try {
      const result = await OrderModel.checkoutTableOrder(
        id,
        parsed.data.paymentMethod,
        parsed.data.tipCents,
        parsed.data.paidCents,
        parsed.data.releaseTable,
      );
      return NextResponse.json({ success: true, result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el cobro';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  /**
   * POST /api/orders/[id]/pay
   */
  static async pay(
    request: Request,
    props: { params: Promise<{ id: string }> },
  ) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin', 'kitchen', 'host', 'cashier'].includes(staff.role)) {
      return NextResponse.json({ error: 'No tienes permisos para registrar cobros.' }, { status: 403 });
    }

    const { id: orderId } = await props.params;
    const json = await request.json().catch(() => null);
    const parsed = paymentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos de pago inválidos.' }, { status: 400 });
    }

    try {
      const order = await OrderModel.registerPublicOrderPayment(
        orderId,
        parsed.data.paymentMethod,
        parsed.data.paidAmountCents,
        parsed.data.tokenNumber,
        parsed.data.serviceType,
      );
      return NextResponse.json({ order });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar pago';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  /**
   * POST /api/kds/status
   */
  static async updateKdsStatus(request: Request) {
    const staff = await getCurrentStaff();
    if (!staff || !['kitchen', 'owner', 'admin', 'host'].includes(staff.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para cambiar estados en cocina.' },
        { status: 403 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = kdsStatusSchema.safeParse(json);
    const targetStatus = parsed.data?.status || parsed.data?.nextStatus;

    if (!parsed.success || !targetStatus) {
      return NextResponse.json(
        { error: 'Datos de transición inválidos. Se requiere status o nextStatus.' },
        { status: 400 },
      );
    }

    try {
      const updatedCount = await OrderModel.updateKdsItemStatus(parsed.data.itemIds, targetStatus);
      return NextResponse.json({ success: true, updatedCount });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar estado en cocina';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  /**
   * POST /api/orders/[id]/serve
   */
  static async serve(
    _request: Request,
    props: { params: Promise<{ id: string }> },
  ) {
    const staff = await getCurrentStaff();
    if (!staff || !['kitchen', 'waiter', 'host', 'cashier', 'admin', 'owner'].includes(staff.role)) {
      return NextResponse.json({ error: 'No autorizado para marcar comida como servida' }, { status: 403 });
    }

    const { id: orderId } = await props.params;

    try {
      const updatedCount = await OrderModel.serveOrderItems(orderId);
      return NextResponse.json({ success: true, updatedCount });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al marcar comida como servida';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }
}

