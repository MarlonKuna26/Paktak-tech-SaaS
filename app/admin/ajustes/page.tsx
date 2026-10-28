import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SettingsManager } from '@/components/admin/settings-manager';

export default async function SettingsPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        No tienes permisos para acceder a los ajustes del restaurante.
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, timezone, currency, settings, plan, status, trial_ends_at')
    .eq('id', staff.restaurantId)
    .single();

  if (!restaurant) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        No se encontró la información del restaurante.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16 font-sans">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#EAA228]">Configuración</span>
        <h1 className="text-3xl font-black tracking-tight text-[#181C20]">Ajustes del Restaurante</h1>
        <p className="text-xs text-[#666E7A] max-w-xl">
          Gestiona los datos principales de tu local, moneda, impuestos, horarios y el pie de comprobante térmico.
        </p>
      </div>

      <SettingsManager
        initialData={{
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          timezone: restaurant.timezone,
          currency: restaurant.currency,
          plan: restaurant.plan,
          status: restaurant.status,
          trialEndsAt: restaurant.trial_ends_at,
          settings: restaurant.settings,
        }}
      />
    </div>
  );
}
