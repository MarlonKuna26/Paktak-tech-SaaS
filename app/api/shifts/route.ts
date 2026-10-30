import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { CashShiftModel } from '@/lib/models/cash-shift.model';
import { RestaurantModel } from '@/lib/models/restaurant.model';

export async function GET(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');

  try {
    const restaurant = await RestaurantModel.getById(staff.restaurantId).catch(() => null);
    const defaultInitialCashDollars = (restaurant?.settings as any)?.default_initial_cash_dollars ?? 50;

    if (dateStr) {
      // Listar turnos del día seleccionado
      const startIso = `${dateStr}T00:00:00.000Z`;
      const endIso = `${dateStr}T23:59:59.999Z`;
      const shifts = await CashShiftModel.listByDate(staff.restaurantId, startIso, endIso);
      const current = await CashShiftModel.getCurrentShift(staff.restaurantId);
      return NextResponse.json({
        shifts,
        currentShift: current.shift,
        currentMetrics: current.liveMetrics,
        defaultInitialCashDollars,
        userRole: staff.role,
      });
    }

    // Por defecto retornar el turno abierto en curso
    const current = await CashShiftModel.getCurrentShift(staff.restaurantId);
    return NextResponse.json({
      currentShift: current.shift,
      liveMetrics: current.liveMetrics,
      defaultInitialCashDollars,
      userRole: staff.role,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar turnos de caja';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado para abrir turno' }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      shiftName?: string;
      cashierName?: string;
      cashierUserId?: string;
      initialCashDollars?: number;
      notes?: string;
    };

    const initialCashCents = Math.round(Number(body.initialCashDollars || 0) * 100);

    const newShift = await CashShiftModel.openShift(staff.restaurantId, body.cashierUserId || staff.id, {
      shiftName: body.shiftName || 'Turno 1',
      cashierName: body.cashierName || staff.restaurantName || 'Cajera',
      initialCashCents,
      notes: body.notes,
    });

    if (['owner', 'admin'].includes(staff.role) && body.initialCashDollars !== undefined) {
      await RestaurantModel.updateSettings(staff.restaurantId, {
        settings: {
          default_initial_cash_dollars: Number(body.initialCashDollars),
        },
      }).catch(() => {});
    }

    return NextResponse.json({ message: 'Turno abierto exitosamente', shift: newShift }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al abrir turno de caja';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
