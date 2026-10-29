import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { CashShiftModel } from '@/lib/models/cash-shift.model';

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado para cerrar turno' }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      shiftId?: string;
      finalCashDollars?: number;
      leftForNextShiftDollars?: number;
      notes?: string;
    };

    if (!body.shiftId) {
      return NextResponse.json({ error: 'Falta el identificador del turno.' }, { status: 400 });
    }

    const finalCashCents = Math.round(Number(body.finalCashDollars || 0) * 100);
    const leftForNextShiftCents = Math.round(Number(body.leftForNextShiftDollars || 0) * 100);

    const closed = await CashShiftModel.closeShift(staff.restaurantId, body.shiftId, {
      finalCashCents,
      leftForNextShiftCents,
      notes: body.notes,
    });

    return NextResponse.json({
      message: 'Arqueo y cierre de turno realizado exitosamente',
      shift: closed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al cerrar turno de caja';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

