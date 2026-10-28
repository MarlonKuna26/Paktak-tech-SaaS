import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { StaffModel } from '@/lib/models/staff.model';

const createStaffSchema = z.object({
  fullName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().trim().email('Correo electrónico no válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'cashier', 'waiter', 'kitchen', 'host'], {
    message: 'Rol inválido',
  }),
});

const updateStaffSchema = z.object({
  role: z.enum(['admin', 'cashier', 'waiter', 'kitchen', 'host']).optional(),
  active: z.boolean().optional(),
  newPassword: z.string().min(6).optional(),
});

export class StaffController {
  /**
   * GET /api/staff
   */
  static async list() {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    try {
      const data = await StaffModel.listByRestaurant(staff.restaurantId, staff.id);
      return NextResponse.json({ staff: data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar personal';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  /**
   * POST /api/staff
   */
  static async create(request: Request) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
      return NextResponse.json({ error: 'Solo el administrador o dueño puede registrar empleados' }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const parsed = createStaffSchema.safeParse(json);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Datos incompletos';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    try {
      const newStaff = await StaffModel.create(staff.restaurantId, parsed.data);
      return NextResponse.json(
        {
          message: `Empleado ${parsed.data.fullName} registrado exitosamente como ${parsed.data.role}.`,
          staff: newStaff,
        },
        { status: 201 },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar empleado';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  /**
   * PATCH /api/staff/[id]
   */
  static async update(request: Request, props: { params: Promise<{ id: string }> }) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await props.params;
    const json = await request.json().catch(() => null);
    const parsed = updateStaffSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    try {
      await StaffModel.update(staff.restaurantId, id, parsed.data, staff.id);
      return NextResponse.json({ message: 'Empleado actualizado con éxito' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar empleado';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  /**
   * DELETE /api/staff/[id]
   */
  static async remove(_request: Request, props: { params: Promise<{ id: string }> }) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await props.params;
    try {
      await StaffModel.remove(staff.restaurantId, id, staff.id);
      return NextResponse.json({ message: 'Empleado removido del restaurante con éxito' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al remover empleado';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }
}
