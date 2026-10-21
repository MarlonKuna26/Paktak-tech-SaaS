import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminDashboardOverview } from '@/components/dashboard/admin-overview';

export const metadata = {
  title: 'Resumen Ejecutivo | Paktak Tech',
};

export default async function AdminPage() {
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect('/auth/login');
  }

  // Redirección por roles restringidos al iniciar sesión
  if (staff.role === 'waiter') {
    redirect('/admin/mesero');
  }

  if (staff.role === 'kitchen') {
    redirect('/admin/cocina');
  }

  if (staff.role === 'cashier' || staff.role === 'host') {
    redirect('/admin/mesas');
  }

  // Resolver host URL para links de WhatsApp
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const hostUrl = `${protocol}://${host}`;

  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().split('T')[0];
  const startIso = `${today}T00:00:00.000Z`;
  const endIso = `${today}T23:59:59.999Z`;

  // 1. Cargar Órdenes de Salón del día
  const { data: rawSalonOrders } = await supabase
    .from('orders')
    .select('id, total_cents, order_number, status, closed_at, waiter_id, waiter:staff_members(full_name)')
    .eq('restaurant_id', staff.restaurantId)
    .gte('opened_at', startIso)
    .lte('opened_at', endIso)
    .order('opened_at', { ascending: false });

  // 2. Cargar Pedidos Públicos (WhatsApp / Web / Delivery / Takeout)
  const { data: rawPublicOrders } = await supabase
    .from('public_order_requests')
    .select('id, tracking_code, customer_name, total_cents, status, service_type, payment_status, payment_method, created_at')
    .eq('restaurant_id', staff.restaurantId)
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: false });

  const salonOrders = rawSalonOrders || [];
  const publicOrders = rawPublicOrders || [];

  // 3. Cálculos Consolidados
  const paidSalon = salonOrders.filter((o) => o.status === 'pagada');
  const paidPublic = publicOrders.filter((o) => o.payment_status === 'pagado');

  const salonSales = paidSalon.reduce((acc, o) => acc + (o.total_cents || 0), 0);
  const publicSales = paidPublic.reduce((acc, o) => acc + (o.total_cents || 0), 0);
  const todaySalesCents = salonSales + publicSales;

  const totalOrders = salonOrders.length + publicOrders.length;
  const avgTicketCents = totalOrders > 0 ? Math.round(todaySalesCents / (paidSalon.length + paidPublic.length || 1)) : 0;
  const operatingCostCents = Math.round(todaySalesCents * 0.35);
  const netMarginCents = todaySalesCents - operatingCostCents;

  const pendingPickup = publicOrders.filter((o) => o.payment_status === 'pendiente' && o.status !== 'cancelado' && o.status !== 'rechazado');

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
    const waiterObj = Array.isArray(so.waiter) ? so.waiter[0] : so.waiter;
    const name = waiterObj?.full_name || 'Mesero Salón';
    const curr = creatorMap.get(name) || { role: 'Mesero', count: 0, totalCents: 0 };
    creatorMap.set(name, {
      role: 'Mesero',
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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
