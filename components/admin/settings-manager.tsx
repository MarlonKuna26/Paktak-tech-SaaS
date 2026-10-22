'use client';

import { useState } from 'react';
import {
  Building2,
  DollarSign,
  Clock,
  Printer,
  Bell,
  Check,
  AlertCircle,
  Save,
  Globe,
  Phone,
  MapPin,
  Percent,
} from 'lucide-react';

export type RestaurantSettings = {
  phone?: string;
  address?: string;
  tax_rate?: number;
  tax_name?: string;
  tax_included?: boolean;
  default_tip_percentage?: number;
  opening_hours?: string;
  ticket_footer?: string;
  sound_alerts_enabled?: boolean;
  capacity?: number;
};

export type RestaurantData = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  settings?: RestaurantSettings;
};

export function SettingsManager({ initialData }: { initialData: RestaurantData }) {
  const [data, setData] = useState(initialData);

  // Form states
  const [name, setName] = useState(initialData.name);
  const [currency, setCurrency] = useState(initialData.currency || 'USD');
  const [timezone, setTimezone] = useState(initialData.timezone || 'America/Guayaquil');
  const [phone, setPhone] = useState(initialData.settings?.phone ?? '');
  const [address, setAddress] = useState(initialData.settings?.address ?? '');
  const [capacity, setCapacity] = useState<number>(initialData.settings?.capacity ?? 40);
  const [taxRate, setTaxRate] = useState<number>(initialData.settings?.tax_rate ?? 15);
  const [taxName, setTaxName] = useState<string>(initialData.settings?.tax_name || 'IVA');
  const [defaultTip, setDefaultTip] = useState<number>(initialData.settings?.default_tip_percentage ?? 10);
  const [openingHours, setOpeningHours] = useState(initialData.settings?.opening_hours || '');
  const [ticketFooter, setTicketFooter] = useState(
    initialData.settings?.ticket_footer || '¡Gracias por su visita! Por favor vuelva pronto.'
  );
  const [soundAlerts, setSoundAlerts] = useState<boolean>(
    initialData.settings?.sound_alerts_enabled ?? true
  );

  const [activeTab, setActiveTab] = useState<'general' | 'finanzas' | 'operacion' | 'ticket'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/restaurants/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          currency,
          timezone,
          settings: {
            phone: phone.trim(),
            address: address.trim(),
            capacity: Number(capacity) || 0,
            tax_rate: Number(taxRate) || 0,
            tax_name: taxName.trim() || 'IVA',
            default_tip_percentage: Number(defaultTip) || 0,
            opening_hours: openingHours.trim(),
            ticket_footer: ticketFooter.trim(),
            sound_alerts_enabled: soundAlerts,
          },
        }),
      });

      const body = (await response.json()) as { ok?: boolean; error?: string; restaurant?: RestaurantData };

      setIsSaving(false);

      if (!response.ok || !body.ok) {
        setMessage({ ok: false, text: body.error || 'No se pudieron guardar los cambios.' });
      } else {
        setMessage({ ok: true, text: 'Configuración del restaurante actualizada correctamente en todo el sistema.' });
        if (body.restaurant) {
          setData(body.restaurant);
        }
      }
    } catch {
      setIsSaving(false);
      setMessage({ ok: false, text: 'Error al conectar con el servidor.' });
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Navegación por Pestañas */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'general'
              ? 'border-[#f3a806] text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Datos del Local</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finanzas')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'finanzas'
              ? 'border-[#f3a806] text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Moneda, Impuestos & Propinas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('operacion')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'operacion'
              ? 'border-[#f3a806] text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Horarios & Alertas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ticket')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'ticket'
              ? 'border-[#f3a806] text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Pie de Ticket & Comprobante</span>
        </button>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl border p-4 text-xs font-semibold ${
            message.ok
              ? 'border-emerald-500/20 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-500/20 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
          }`}
        >
          {message.ok ? <Check className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* PESTAÑA 1: DATOS GENERALES */}
        {activeTab === 'general' && (
          <div className="rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Información del Restaurante</h2>
              <p className="text-xs text-zinc-500">Datos públicos visibles en la carta digital, reservas y tickets.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nombre Comercial</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ej: La Trattoria Gourmet"
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Teléfono / WhatsApp de Pedidos</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+593 99 999 9999"
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Dirección del Establecimiento</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. 10 de Agosto y Orellana"
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Capacidad Total Estimada (Comensales)</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Slug Público (Enlace Web)</span>
                </label>
                <div className="flex items-center rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-xs font-mono text-zinc-500">
                  <span>paktak.tech/</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{data.slug}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: FINANZAS, IMPUESTOS & PROPINAS */}
        {activeTab === 'finanzas' && (
          <div className="rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Moneda, Impuestos y Propinas</h2>
              <p className="text-xs text-zinc-500">Define los cálculos automáticos de cobro para el cajero y mesero.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Moneda de Facturación</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none"
                >
                  <option value="USD">Dólar Estadounidense ($ USD)</option>
                  <option value="EUR">Euro (€ EUR)</option>
                  <option value="PEN">Sol Peruano (S/ PEN)</option>
                  <option value="COP">Peso Colombiano ($ COP)</option>
                  <option value="MXN">Peso Mexicano ($ MXN)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nombre del Impuesto Local</label>
                <input
                  type="text"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="IVA, IGV, ITBMS..."
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Porcentaje de {taxName} (%)</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="35"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Propina Sugerida por Defecto (%)</label>
                <select
                  value={defaultTip}
                  onChange={(e) => setDefaultTip(parseInt(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none"
                >
                  <option value={0}>0% (Sin propina sugerida)</option>
                  <option value={5}>5%</option>
                  <option value={10}>10% (Recomendado estándar)</option>
                  <option value={12}>12%</option>
                  <option value={15}>15%</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: OPERACIÓN & ALERTAS */}
        {activeTab === 'operacion' && (
          <div className="rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Horarios y Alertas Sonoras</h2>
              <p className="text-xs text-zinc-500">Configura la dinámica operativa del salón y cocina.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Horario de Atención al Público</span>
                </label>
                <input
                  type="text"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder="Ej: Lunes a Sábado: 11:30 - 23:00 / Domingos: 12:00 - 18:00"
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Zona Horaria del Sistema</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none"
                >
                  <option value="America/Guayaquil">Ecuador / Lima / Bogotá (UTC-5)</option>
                  <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                  <option value="America/Santiago">Santiago de Chile (UTC-3)</option>
                  <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
                  <option value="Europe/Madrid">España / Madrid (UTC+1)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#f3a806]" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Timbre y Alertas de Sonido en Vivo</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Reproduce campana acústica al entrar nueva orden en KDS y cuando la cocina pasa un plato a &ldquo;Listo&rdquo;.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f3a806]"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: PIE DE TICKET */}
        {activeTab === 'ticket' && (
          <div className="rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Personalización de Tickets Térmicos</h2>
              <p className="text-xs text-zinc-500">Personaliza el mensaje que sale impreso al final del comprobante de mesa.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Mensaje de Agradecimiento / Redes</label>
                <textarea
                  rows={4}
                  value={ticketFooter}
                  onChange={(e) => setTicketFooter(e.target.value)}
                  placeholder="¡Gracias por su visita! Síguenos en @tucuenta..."
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-3.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#f3a806] focus:outline-none"
                />
                <p className="text-[11px] text-zinc-400">Aparecerá centrado al final de cada recibo de 80mm y 58mm.</p>
              </div>

              {/* Vista previa en papel térmico */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950 p-4 font-mono text-[11px] text-zinc-800 dark:text-zinc-300 space-y-2">
                <div className="text-center border-b border-dashed border-zinc-300 dark:border-zinc-700 pb-2">
                  <p className="font-bold text-xs uppercase">{name || 'Nombre del Restaurante'}</p>
                  <p className="text-[10px] text-zinc-500">{address}</p>
                  <p className="text-[10px] text-zinc-500">Tel: {phone}</p>
                </div>
                <div className="py-2 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>1x Cebiche Clásico</span>
                    <span>$12.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Bebida Refrescante</span>
                    <span>$3.00</span>
                  </div>
                  <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-1 flex justify-between font-bold">
                    <span>TOTAL:</span>
                    <span>$15.50</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-2 text-center text-[10px] text-zinc-500 italic">
                  {ticketFooter || '¡Gracias por su visita!'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botón de Guardar General */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-6 text-xs font-black text-zinc-950 shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando ajustes...' : 'Guardar Todos los Cambios'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
