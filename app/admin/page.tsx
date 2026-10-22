import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminDashboardOverview } from '@/components/dashboard/admin-overview';
import { getPeriodDateRange, type PeriodType } from '@/lib/utils/date-range';

export const metadata = {
  title: 'Resumen Ejecutivo | Paktak Tech',
};

export default async function AdminPage(props: {
  searchParams?: Promise<{ period?: string }>;
}) {
  await connection();
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect('/auth/login');
  }

  // Redirección por roles operativos al iniciar sesión
  if (staff.role === 'kitchen') {
    redirect('/admin/cocina');
  }

  if (staff.role === 'cashier' || staff.role === 'waiter') {
    redirect('/admin/mesas');
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const requestedPeriod = (searchParams.period as PeriodType) || 'hoy';

  // Resolver host URL para links de WhatsApp
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const hostUrl = `${protocol}://${host}`;

  const supabase = await createSupabaseServerClient();
  const timezone = staff.restaurantTimezone || 'America/Guayaquil';
  const periodRange = getPeriodDateRange(requestedPeriod, timezone);

  // 1. Cargar Órdenes de Salón según el período
  let salonQuery = supabase
    .from('orders')
    .select('id, total_cents, order_number, status, closed_at, opened_at, waiter_id, waiter:staff_members(role)')
    .eq('restaurant_id', staff.restaurantId)
    .order('opened_at', { ascending: false });

  if (periodRange.startIso && periodRange.endIso) {
    salonQuery = salonQuery
      .gte('opened_at', periodRange.startIso)
      .lte('opened_at', periodRange.endIso);
  }

  // 2. Cargar Pedidos Públicos según el período
  let publicQuery = supabase
    .from('public_order_requests')
    .select('id, tracking_code, customer_name, total_cents, status, service_type, payment_status, payment_method, created_at')
    .eq('restaurant_id', staff.restaurantId)
    .order('created_at', { ascending: false });

  if (periodRange.startIso && periodRange.endIso) {
    publicQuery = publicQuery
      .gte('created_at', periodRange.startIso)
      .lte('created_at', periodRange.endIso);
  }

  // 3. Totales Históricos acumulados (para verificar y garantizar que la información NUNCA se pierda)
  const [{ data: rawSalonOrders }, { data: rawPublicOrders }, { data: allSalonOrders }, { data: allPublicOrders }] =
    await Promise.all([
      salonQuery,
      publicQuery,
      supabase
        .from('orders')
        .select('total_cents, status')
        .eq('restaurant_id', staff.restaurantId),
      supabase
        .from('public_order_requests')
        .select('total_cents, payment_status')
        .eq('restaurant_id', staff.restaurantId),
    ]);

  const allPaidSalon = (allSalonOrders || []).filter((o) => o.status === 'pagada');
  const allPaidPublic = (allPublicOrders || []).filter((o) => o.payment_status === 'pagado');
  const allTimeSalesCents =
    allPaidSalon.reduce((acc, o) => acc + (o.total_cents || 0), 0) +
    allPaidPublic.reduce((acc, o) => acc + (o.total_cents || 0), 0);
  const allTimeOrdersCount = (allSalonOrders?.length || 0) + (allPublicOrders?.length || 0);

  const salonOrders = rawSalonOrders || [];
  const publicOrders = rawPublicOrders || [];

  // 4. Cálculos Consolidados del período seleccionado
  const paidSalon = salonOrders.filter((o) => o.status === 'pagada');
  const paidPublic = publicOrders.filter((o) => o.payment_status === 'pagado');

  const salonSales = paidSalon.reduce((acc, o) => acc + (o.total_cents || 0), 0);
  const publicSales = paidPublic.reduce((acc, o) => acc + (o.total_cents || 0), 0);
  const todaySalesCents = salonSales + publicSales;

  const totalOrders = salonOrders.length + publicOrders.length;
  const avgTicketCents = totalOrders > 0 ? Math.round(todaySalesCents / (paidSalon.length + paidPublic.length || 1)) : 0;
  const operatingCostCents = Math.round(todaySalesCents * 0.35);
  const netMarginCents = todaySalesCents - operatingCostCents;

  const pendingPickup = publicOrders.filter(
    (o) => o.payment_status === 'pendiente' && o.status !== 'cancelado' && o.status !== 'rechazado',
  );

  // Canales
  const channelMap = new Map<string, { count: number; totalCents: number }>();
  if (salonOrders.length > 0) {
    channelMap.set('Mesas en Salón', {
      count: salonOrders.length,
      totalCents: salonSales,
    });
  }
  for (const po of publicOrders) {
    const label =
      po.service_type === 'para_llevar'
        ? 'Para Llevar / Takeout'
        : po.service_type === 'paleta_madera'
        ? 'Paleta / Mostrador'
        : 'WhatsApp / Menú Digital';
    const curr = channelMap.get(label) || { count: 0, totalCents: 0 };
    channelMap.set(label, {
      count: curr.count + 1,
      totalCents: curr.totalCents + (po.total_cents || 0),
    });
  }

  const channels = Array.from(channelMap.entries()).map(([name, val]) => ({
    name,
    count: val.count,
    totalCents: val.totalCents,
    percentage: todaySalesCents > 0 ? Math.round((val.totalCents / todaySalesCents) * 100) : 0,
  }));

  // Creadores / Atendidos por
  const creatorMap = new Map<string, { role: string; count: number; totalCents: number }>();
  for (const so of salonOrders) {
    const waiterObj = (Array.isArray(so.waiter) ? so.waiter[0] : so.waiter) as { role?: string } | null;
    const roleName = waiterObj?.role
      ? (waiterObj.role === 'cashier' ? 'Cajero & Servicio' : `Personal (${waiterObj.role})`)
      : 'Cajero & Servicio';
    const curr = creatorMap.get(roleName) || { role: waiterObj?.role || 'cashier', count: 0, totalCents: 0 };
    creatorMap.set(roleName, {
      role: waiterObj?.role || 'cashier',
      count: curr.count + 1,
      totalCents: curr.totalCents + (so.total_cents || 0),
    });
  }
  if (publicOrders.length > 0) {
    creatorMap.set('Clientes Web / WhatsApp', {
      role: 'Autogestión Web',
      count: publicOrders.length,
      totalCents: publicSales,
    });
  }

  const creators = Array.from(creatorMap.entries()).map(([name, val]) => ({
    name,
    role: val.role,
    count: val.count,
    totalCents: val.totalCents,
  }));

  // Órdenes Recientes (mezcla de salón y web)
  const recentOrders = [
    ...publicOrders.slice(0, 5).map((po) => ({
      id: po.id,
      code: po.tracking_code || 'WEB',
      customer: po.customer_name || 'Cliente Web',
      totalCents: po.total_cents || 0,
      channel: po.service_type === 'para_llevar' ? 'Takeout' : 'WhatsApp / Web',
      isPaid: po.payment_status === 'pagado',
      status: po.status,
      time: new Date(po.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })),
    ...salonOrders.slice(0, 5).map((so) => ({
      id: so.id,
      code: `M-${so.order_number}`,
      customer: 'Comanda de Salón',
      totalCents: so.total_cents || 0,
      channel: 'Mesa Salón',
      isPaid: so.status === 'pagada',
      status: so.status,
      time: so.closed_at || so.opened_at
        ? new Date(so.closed_at || so.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Hoy',
    })),
  ].slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16 font-sans">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#f3a806]">
          Panel de Control
        </span>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          Resumen Ejecutivo
        </h1>
        <p className="text-xs text-zinc-500 max-w-xl">
          Supervisa en vivo la captación de clientes por WhatsApp, ventas cruzadas y márgenes de operación en tiempo real.
        </p>
      </div>

      <AdminDashboardOverview
        staff={staff}
        data={{
          selectedPeriod: requestedPeriod,
          periodLabel: periodRange.label,
          allTimeSalesCents,
          allTimeOrdersCount,
          todaySalesCents,
          operatingCostCents,
          netMarginCents,
          totalOrders,
          avgTicketCents,
          pendingPickupCount: pendingPickup.length,
          channels,
          creators,
          recentOrders,
        }}
        hostUrl={hostUrl}
      />
    </div>
  );
}
