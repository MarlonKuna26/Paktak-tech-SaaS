import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { CashShiftModel } from '@/lib/models/cash-shift.model';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

    // Regla de Negocio: No se puede cerrar caja si aún hay mesas ocupadas en el salón
    const supabase = await createSupabaseServerClient();
    const { data: occupiedTables } = await supabase
      .from('tables')
      .select('id, table_number')
      .eq('restaurant_id', staff.restaurantId)
      .eq('status', 'ocupada');

    if (occupiedTables && occupiedTables.length > 0) {
      const nums = occupiedTables.map((t) => `#${t.table_number}`).join(', ');
      return NextResponse.json(
        {
          error: `No se puede cerrar la caja. Aún hay ${occupiedTables.length} mesa(s) ocupada(s) en el salón (${nums}). Debes cobrar y liberar todas las mesas antes de realizar el arqueo.`,
        },
        { status: 400 },
      );
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

