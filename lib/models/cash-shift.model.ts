import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CashShift = {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  shift_name: string;
  cashier_name: string;
  opened_at: string;
  closed_at: string | null;
  initial_cash_cents: number;
  final_cash_cents: number | null;
  calculated_cash_cents: number;
  calculated_digital_cents: number;
  calculated_total_cents: number;
  expected_cash_cents: number;
  difference_cents: number;
  left_for_next_shift_cents: number;
  status: 'abierto' | 'cerrado';
  notes: string | null;
  created_at: string;
};

export type ShiftLiveMetrics = {
  cashSalesCents: number;
  digitalSalesCents: number;
  totalSalesCents: number;
  expectedCashCents: number;
  ordersCount: number;
};

export class CashShiftModel {
  /**
   * Obtiene el turno actualmente abierto en el restaurante con sus métricas en vivo
   */
  static async getCurrentShift(restaurantId: string): Promise<{
    shift: CashShift | null;
    liveMetrics: ShiftLiveMetrics | null;
  }> {
    const supabase = await createSupabaseServerClient();

    const { data: shift, error } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'abierto')
      .order('opened_at', { ascending: false })
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!shift) {
      return { shift: null, liveMetrics: null };
    }

    const liveMetrics = await this.calculateSalesInRange(
      restaurantId,
      shift.opened_at,
      new Date().toISOString(),
      shift.initial_cash_cents,
    );

    return {
      shift: shift as CashShift,
      liveMetrics,
    };
  }

  /**
   * Obtiene todos los turnos del día o rango de fechas
   */
  static async listByDate(
    restaurantId: string,
    dateIsoStart: string,
    dateIsoEnd: string,
  ): Promise<Array<CashShift & { liveMetrics?: ShiftLiveMetrics }>> {
    const supabase = await createSupabaseServerClient();

    const { data: shifts, error } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('opened_at', dateIsoStart)
      .lte('opened_at', dateIsoEnd)
      .order('opened_at', { ascending: true });

    if (error) throw new Error(error.message);

    const result = [];
    for (const s of (shifts || []) as CashShift[]) {
      if (s.status === 'abierto') {
        const live = await this.calculateSalesInRange(
          restaurantId,
          s.opened_at,
          new Date().toISOString(),
          s.initial_cash_cents,
        );
        result.push({ ...s, liveMetrics: live });
      } else {
        result.push(s);
      }
    }

    return result;
  }

  /**
   * Abre un nuevo turno de caja con fondo inicial
   */
  static async openShift(
    restaurantId: string,
    userId: string,
    input: {
      shiftName: string;
      cashierName: string;
      initialCashCents: number;
      notes?: string;
    },
  ): Promise<CashShift> {
    const supabase = await createSupabaseServerClient();

    // Validar que no haya un turno ya abierto
    const { data: currentOpen } = await supabase
      .from('cash_shifts')
      .select('id, shift_name, cashier_name')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'abierto')
      .maybeSingle();

    if (currentOpen) {
      throw new Error(
        `Ya hay un turno abierto (${currentOpen.shift_name} por ${currentOpen.cashier_name}). Debes realizar el arqueo y cierre antes de abrir uno nuevo.`,
      );
    }

    const { data: newShift, error } = await supabase
      .from('cash_shifts')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        shift_name: input.shiftName.trim() || 'Turno 1',
        cashier_name: input.cashierName.trim() || 'Cajera',
        initial_cash_cents: Math.max(0, input.initialCashCents),
        expected_cash_cents: Math.max(0, input.initialCashCents),
        status: 'abierto',
        notes: input.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return newShift as CashShift;
  }

  /**
   * Realiza el arqueo y cierre del turno actual
   */
  static async closeShift(
    restaurantId: string,
    shiftId: string,
    input: {
      finalCashCents: number;
      leftForNextShiftCents?: number;
      notes?: string;
    },
  ): Promise<CashShift> {
    const supabase = await createSupabaseServerClient();

    const { data: shift, error: findError } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('id', shiftId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (findError || !shift) {
      throw new Error('Turno de caja no encontrado.');
    }

    if (shift.status === 'cerrado') {
      throw new Error('Este turno ya fue cerrado previamente.');
    }

    const nowIso = new Date().toISOString();
    const metrics = await this.calculateSalesInRange(
      restaurantId,
      shift.opened_at,
      nowIso,
      shift.initial_cash_cents,
    );

    const finalCashCents = Math.max(0, input.finalCashCents);
    const leftForNextShiftCents = Math.max(0, input.leftForNextShiftCents ?? 0);
    const expectedCashCents = shift.initial_cash_cents + metrics.cashSalesCents;
    const differenceCents = finalCashCents - expectedCashCents;

    const { data: updated, error: updateError } = await supabase
      .from('cash_shifts')
      .update({
        closed_at: nowIso,
        status: 'cerrado',
        final_cash_cents: finalCashCents,
        calculated_cash_cents: metrics.cashSalesCents,
        calculated_digital_cents: metrics.digitalSalesCents,
        calculated_total_cents: metrics.totalSalesCents,
        expected_cash_cents: expectedCashCents,
        difference_cents: differenceCents,
        left_for_next_shift_cents: leftForNextShiftCents,
        notes: input.notes?.trim() || shift.notes,
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);
    return updated as CashShift;
  }

  /**
   * Cálculo de ventas en salón y ventas web/mostrador en el rango de tiempo del turno
   */
  private static async calculateSalesInRange(
    restaurantId: string,
    startIso: string,
    endIso: string,
    initialCashCents: number,
  ): Promise<ShiftLiveMetrics> {
    const supabase = await createSupabaseServerClient();

    // 1. Pagos de salón
    const paymentsQuery = supabase
      .from('payments')
      .select('method, amount_cents')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    // 2. Pedidos públicos cobrados
    const publicQuery = supabase
      .from('public_order_requests')
      .select('payment_method, paid_amount_cents, total_cents')
      .eq('restaurant_id', restaurantId)
      .eq('payment_status', 'pagado')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    const [{ data: payments }, { data: publicOrders }] = await Promise.all([
      paymentsQuery,
      publicQuery,
    ]);

    let cashSalesCents = 0;
    let digitalSalesCents = 0;
    let ordersCount = 0;

    for (const p of payments || []) {
      ordersCount++;
      const amt = p.amount_cents || 0;
      if (p.method === 'efectivo') {
        cashSalesCents += amt;
      } else {
        digitalSalesCents += amt;
      }
    }

    for (const po of publicOrders || []) {
      ordersCount++;
      const amt = po.paid_amount_cents || po.total_cents || 0;
      if (po.payment_method === 'efectivo' || !po.payment_method) {
        cashSalesCents += amt;
      } else {
        digitalSalesCents += amt;
      }
    }

    const totalSalesCents = cashSalesCents + digitalSalesCents;
    const expectedCashCents = initialCashCents + cashSalesCents;

    return {
      cashSalesCents,
      digitalSalesCents,
      totalSalesCents,
      expectedCashCents,
      ordersCount,
    };
  }
}

