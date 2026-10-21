import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const costPercentage = Math.min(100, Math.max(0, Number(searchParams.get('costPercentage') || 35)));

  const supabase = await createSupabaseServerClient();
  const startIso = `${targetDate}T00:00:00.000Z`;
  const endIso = `${targetDate}T23:59:59.999Z`;

  try {
    // 1. Cargar Órdenes de Salón
    const { data: salonOrders } = await supabase
      .from('orders')
      .select('id, total_cents, waiter_id, status, closed_at, waiter:staff_members(role)')
      .eq('restaurant_id', staff.restaurantId)
      .eq('status', 'pagada')
      .gte('closed_at', startIso)
      .lte('closed_at', endIso);

    // 2. Cargar Pedidos Públicos (WhatsApp / Web / Takeout)
    const { data: publicOrders } = await supabase
      .from('public_order_requests')
      .select('id, total_cents, customer_name, service_type, payment_status, payment_method, created_at')
      .eq('restaurant_id', staff.restaurantId)
      .eq('payment_status', 'pagado')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    // 3. Cargar Pagos directos
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount_cents, method, created_at')
      .eq('restaurant_id', staff.restaurantId)
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    // 4. Calcular métricas consolidadas
    const sOrders = salonOrders || [];
    const pOrders = publicOrders || [];
    const payList = payments || [];

    const salonTotalCents = sOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
    const publicTotalCents = pOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
    const totalSalesCents = salonTotalCents + publicTotalCents;
    const totalOrders = sOrders.length + pOrders.length;
    const avgTicketCents = totalOrders > 0 ? Math.round(totalSalesCents / totalOrders) : 0;

    const operatingCostCents = Math.round(totalSalesCents * (costPercentage / 100));
    const netMarginCents = totalSalesCents - operatingCostCents;

    // A) Cruzamiento por Canal
    const channelMap = new Map<string, { count: number; total_cents: number }>();
    if (sOrders.length > 0) {
      channelMap.set('Mesas en Salón', {
        count: sOrders.length,
        total_cents: salonTotalCents,
      });
    }
    for (const po of pOrders) {
      const channelLabel =
        po.service_type === 'para_llevar'
          ? 'Para Llevar / Takeout'
          : po.service_type === 'paleta_madera'
          ? 'Paleta / Mostrador'
          : 'WhatsApp / Menú Digital';
      const existing = channelMap.get(channelLabel) || { count: 0, total_cents: 0 };
      channelMap.set(channelLabel, {
        count: existing.count + 1,
        total_cents: existing.total_cents + (po.total_cents || 0),
      });
    }

    const byChannel = Array.from(channelMap.entries()).map(([channel, val]) => ({
      channel,
      orders_count: val.count,
      total_cents: val.total_cents,
      percentage: totalSalesCents > 0 ? Math.round((val.total_cents / totalSalesCents) * 100) : 0,
    }));

    // B) Cruzamiento por Quién Realizó / Atendió el Pedido
    const creatorMap = new Map<string, { role: string; count: number; total_cents: number }>();
    for (const o of sOrders) {
      const waiterObj = (Array.isArray(o.waiter) ? o.waiter[0] : o.waiter) as { role?: string } | null;
      const waiterName = waiterObj?.role
        ? (waiterObj.role === 'cashier' ? 'Cajero & Servicio' : `Personal (${waiterObj.role})`)
        : 'Cajero & Servicio';
      const existing = creatorMap.get(waiterName) || { role: waiterObj?.role || 'cashier', count: 0, total_cents: 0 };
      creatorMap.set(waiterName, {
        role: waiterObj?.role || 'cashier',
        count: existing.count + 1,
        total_cents: existing.total_cents + (o.total_cents || 0),
      });
    }
    for (const po of pOrders) {
      const existing = creatorMap.get('Clientes Web / WhatsApp') || {
        role: 'Autogestión Web',
        count: 0,
        total_cents: 0,
      };
      creatorMap.set('Clientes Web / WhatsApp', {
        role: 'Autogestión Web',
        count: existing.count + 1,
        total_cents: existing.total_cents + (po.total_cents || 0),
      });
    }

    const byCreator = Array.from(creatorMap.entries()).map(([creator, val]) => ({
      creator,
      role: val.role,
      orders_count: val.count,
      total_cents: val.total_cents,
      percentage: totalSalesCents > 0 ? Math.round((val.total_cents / totalSalesCents) * 100) : 0,
    }));

    // C) Cruzamiento por Método de Pago
    const paymentMap = new Map<string, { count: number; total_cents: number }>();
    for (const p of payList) {
      const methodLabel = p.method || 'efectivo';
      const existing = paymentMap.get(methodLabel) || { count: 0, total_cents: 0 };
      paymentMap.set(methodLabel, {
        count: existing.count + 1,
        total_cents: existing.total_cents + (p.amount_cents || 0),
      });
    }
    // Añadir métodos de publicOrders si no están en payments
    for (const po of pOrders) {
      const method = po.payment_method || 'efectivo';
      if (payList.length === 0) {
        const existing = paymentMap.get(method) || { count: 0, total_cents: 0 };
        paymentMap.set(method, {
          count: existing.count + 1,
          total_cents: existing.total_cents + (po.total_cents || 0),
        });
      }
    }

    const byPaymentMethod = Array.from(paymentMap.entries()).map(([method, val]) => ({
      method,
      count: val.count,
      total_cents: val.total_cents,
    }));

    return NextResponse.json({
      report: {
        date: targetDate,
        total_sales_cents: totalSalesCents,
        total_orders: totalOrders,
        avg_ticket_cents: avgTicketCents,
        operating_cost_cents: operatingCostCents,
        net_margin_cents: netMarginCents,
        cost_percentage: costPercentage,
        by_channel: byChannel,
        by_creator: byCreator,
        payment_methods: byPaymentMethod,
        top_products: [],
        by_hour: [],
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al generar reporte';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
