'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type RestaurantData = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
};

export function SettingsManager({
  initialData,
}: {
  initialData: RestaurantData;
}) {
  const [data, setData] = useState(initialData);
  const [name, setName] = useState(initialData.name);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const supabase = createSupabaseBrowserClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('restaurants')
      .update({ name: name.trim() })
      .eq('id', data.id);

    setIsSaving(false);

    if (error) {
      setMessage({ ok: false, text: 'No se pudieron guardar los cambios: ' + error.message });
    } else {
      setData((prev) => ({ ...prev, name: name.trim() }));
      setMessage({ ok: true, text: 'Información del restaurante actualizada correctamente.' });
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.ok
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tarjeta de Información General */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight">Datos del Local</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuración principal de tu restaurante dentro de Paktak SaaS.
        </p>

        <form onSubmit={handleSave} className="mt-6 space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre Comercial</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">Slug Público (URL del menú y reservas)</label>
            <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3.5 py-2.5 text-sm font-mono text-muted-foreground">
              <span>paktak.com/</span>
              <span className="font-semibold text-foreground">{data.slug}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              El identificador único para los links de tus clientes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Zona Horaria</label>
              <input
                type="text"
                disabled
                value={data.timezone}
                className="w-full rounded-xl border bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Moneda</label>
              <input
                type="text"
                disabled
                value={data.currency}
                className="w-full rounded-xl border bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Tarjeta de Suscripción / Plan */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight">Plan y Suscripción</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Detalles de tu cuenta comercial en Paktak Tech.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3 max-w-2xl">
          <div className="rounded-xl border p-4 bg-background">
            <p className="text-xs font-medium uppercase text-muted-foreground">Plan Actual</p>
            <p className="mt-1 text-lg font-bold capitalize text-primary">{data.plan}</p>
          </div>
          <div className="rounded-xl border p-4 bg-background">
            <p className="text-xs font-medium uppercase text-muted-foreground">Estado</p>
            <p className="mt-1 text-lg font-bold capitalize text-emerald-600">{data.status}</p>
          </div>
          <div className="rounded-xl border p-4 bg-background">
            <p className="text-xs font-medium uppercase text-muted-foreground">Período de Prueba</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {data.trialEndsAt ? new Date(data.trialEndsAt).toLocaleDateString() : 'Activo sin límite'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
