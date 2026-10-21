import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { TableModel } from '@/lib/models/table.model';

const createTableSchema = z.object({
  tableNumber: z.number().int().positive().max(999),
  capacity: z.number().int().positive().max(50),
  zone: z.string().trim().max(50).optional().nullable(),
});

const updateTableSchema = z.object({
  tableNumber: z.number().int().positive().max(999).optional(),
  capacity: z.number().int().positive().max(50).optional(),
  zone: z.string().trim().max(50).optional().nullable(),
});

const batchTableSchema = z.object({
  startNumber: z.number().int().positive().max(999),
  count: z.number().int().positive().max(50),
  capacity: z.number().int().positive().max(50),
  zone: z.string().trim().max(50).optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(['libre', 'ocupada', 'reservada']),
});

const assignReservationSchema = z.object({
  reservationId: z.string().uuid(),
});

export class TableController {
  /**
   * GET /api/tables
   */
  static async list() {
    const staff = await getCurrentStaff();
    if (!staff) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
      const tables = await TableModel.listByRestaurant(staff.restaurantId);
      return NextResponse.json({ tables });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar mesas';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  /**
   * POST /api/tables
   */
  static async create(request: Request) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin'].includes(staff.role)) {
      return NextResponse.json({ error: 'Solo el administrador puede crear nuevas mesas' }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const parsed = createTableSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos de mesa inválidos. Verifica número y capacidad.' }, { status: 400 });
    }

    try {
      const table = await TableModel.create(staff.restaurantId, parsed.data);
      return NextResponse.json({ table }, { status: 201 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear mesa';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  /**
   * POST /api/tables/batch
   */
  static async createBatch(request: Request) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin'].includes(staff.role)) {
      return NextResponse.json({ error: 'Solo administradores pueden crear mesas por lote' }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const parsed = batchTableSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos de lote inválidos' }, { status: 400 });
    }

    try {
      const tables = await TableModel.createBatch(staff.restaurantId, parsed.data);
      return NextResponse.json(
        { message: `Se crearon ${tables?.length || 0} mesas correctamente.`, tables },
        { status: 201 },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear lote de mesas';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  /**
   * PATCH /api/tables/[id]
   */
  static async update(request: Request, props: { params: Promise<{ id: string }> }) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin'].includes(staff.role)) {
      return NextResponse.json({ error: 'Solo administradores pueden editar mesas' }, { status: 403 });
    }

    const { id } = await props.params;
    const json = await request.json().catch(() => null);
    const parsed = updateTableSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos de mesa inválidos' }, { status: 400 });
    }

    try {
      const table = await TableModel.update(staff.restaurantId, id, parsed.data);
      return NextResponse.json({ table });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar mesa';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  /**
   * DELETE /api/tables/[id]
   */
  static async remove(_request: Request, props: { params: Promise<{ id: string }> }) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin'].includes(staff.role)) {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar mesas' }, { status: 403 });
    }

    const { id } = await props.params;
    try {
      await TableModel.remove(staff.restaurantId, id);
      return NextResponse.json({ message: 'Mesa eliminada correctamente' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar mesa';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  /**
   * POST /api/tables/[id]/status
   */
  static async updateStatus(request: Request, props: { params: Promise<{ id: string }> }) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin', 'host', 'waiter'].includes(staff.role)) {
      return NextResponse.json({ error: 'No autorizado para cambiar el estado de la mesa' }, { status: 403 });
    }

    const { id } = await props.params;
    const json = await request.json().catch(() => null);
    const parsed = updateStatusSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    try {
      const table = await TableModel.updateStatus(staff.restaurantId, id, parsed.data.status);
      return NextResponse.json({ table });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar estado';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  /**
   * POST /api/tables/[id]/assign
   */
  static async assignReservation(request: Request, props: { params: Promise<{ id: string }> }) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await props.params;
    const json = await request.json().catch(() => null);
    const parsed = assignReservationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'ID de reserva inválido' }, { status: 400 });
    }

    try {
      await TableModel.assignReservation(staff.restaurantId, id, parsed.data.reservationId);
      return NextResponse.json({ message: 'Reserva asignada a la mesa exitosamente' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al asignar reserva';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }
}
