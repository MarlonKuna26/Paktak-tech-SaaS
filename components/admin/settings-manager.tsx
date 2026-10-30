'use client';

import { useState } from 'react';
import { AlertModal } from '@/components/ui/alert-modal';
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
  Wallet,
} from 'lucide-react';

export type RestaurantSettings = {
  phone?: string;
  address?: string;
  tax_rate?: number;
  tax_name?: string;
  tax_included?: boolean;
  default_tip_percentage?: number;
  default_initial_cash_dollars?: number;
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
  const [defaultInitialCash, setDefaultInitialCash] = useState<number>(initialData.settings?.default_initial_cash_dollars ?? 50);
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
            default_initial_cash_dollars: Number(defaultInitialCash) || 0,
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
    <div className="space-y-6 font-sans text-[#181C20]">
      {/* Navegación por Pestañas */}
      <div className="flex border-b border-[#EAE5DE] gap-2 overflow-x-auto pb-px scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'general'
              ? 'border-[#EAA228] text-[#181C20] font-black'
              : 'border-transparent text-[#666E7A] hover:text-[#181C20]'
          }`}
        >
          <Building2 className="w-4 h-4 text-[#EAA228]" />
          <span>Datos del Local</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finanzas')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'finanzas'
              ? 'border-[#EAA228] text-[#181C20] font-black'
              : 'border-transparent text-[#666E7A] hover:text-[#181C20]'
          }`}
        >
          <DollarSign className="w-4 h-4 text-[#EAA228]" />
          <span>Moneda, Impuestos & Propinas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('operacion')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'operacion'
              ? 'border-[#EAA228] text-[#181C20] font-black'
              : 'border-transparent text-[#666E7A] hover:text-[#181C20]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#EAA228]" />
          <span>Horarios & Alertas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ticket')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'ticket'
              ? 'border-[#EAA228] text-[#181C20] font-black'
              : 'border-transparent text-[#666E7A] hover:text-[#181C20]'
          }`}
        >
          <Printer className="w-4 h-4 text-[#EAA228]" />
          <span>Pie de Ticket & Comprobante</span>
        </button>
      </div>

      {/* Modal Central de Éxito o Error de Configuración */}
      <AlertModal
        isOpen={Boolean(message)}
        title={message?.ok ? '¡Ajustes Guardados!' : 'Error de Configuración'}
        message={message?.text || ''}
        variant={message?.ok ? 'success' : 'error'}
        onClose={() => setMessage(null)}
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* PESTAÑA 1: DATOS GENERALES */}
        {activeTab === 'general' && (
          <div className="rounded-[28px] border border-[#EAE5DE] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-[#181C20]">Información del Restaurante</h2>
              <p className="text-xs text-[#666E7A]">Datos públicos visibles en la carta digital, reservas y tickets.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-extrabold text-[#181C20]">Nombre Comercial</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ej: La Trattoria Gourmet"
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-semibold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#181C20] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#EAA228]" />
                  <span>Teléfono / WhatsApp de Pedidos</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+593 99 999 9999"
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-bold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#181C20] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#EAA228]" />
                  <span>Dirección del Establecimiento</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. 10 de Agosto y Orellana"
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-semibold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#181C20]">Capacidad Total Estimada (Comensales)</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-bold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#181C20] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#EAA228]" />
                  <span>Slug Público (Enlace Web)</span>
                </label>
                <div className="flex items-center rounded-xl border border-[#EAE5DE] bg-[#FAF7F2] px-4 h-11 text-xs font-mono text-[#666E7A]">
                  <span>paktak.tech/</span>
                  <span className="font-extrabold text-[#181C20] ml-0.5">{data.slug}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: FINANZAS, IMPUESTOS & PROPINAS */}
        {activeTab === 'finanzas' && (
          <div className="rounded-[28px] border border-[#EAE5DE] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-[#181C20]">Moneda, Impuestos y Propinas</h2>
              <p className="text-xs text-[#666E7A]">Define los cálculos automáticos de cobro para el cajero y mesero.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#181C20]">Moneda de Facturación</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-bold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none"
                >
                  <option value="USD">Dólar Estadounidense ($ USD)</option>
                  <option value="EUR">Euro (€ EUR)</option>
                  <option value="PEN">Sol Peruano (S/ PEN)</option>
                  <option value="COP">Peso Colombiano ($ COP)</option>
                  <option value="MXN">Peso Mexicano ($ MXN)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#181C20]">Nombre del Impuesto Local</label>
                <input
                  type="text"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="IVA, IGV, ITBMS..."
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-bold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#181C20] flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#EAA228]" />
                  <span>Porcentaje de {taxName} (%)</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="35"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-bold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#181C20]">Propina Sugerida por Defecto (%)</label>
                <select
                  value={defaultTip}
                  onChange={(e) => setDefaultTip(parseInt(e.target.value) || 0)}
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-bold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none"
                >
                  <option value={0}>0% (Sin propina sugerida)</option>
                  <option value={5}>5%</option>
                  <option value={10}>10% (Recomendado estándar)</option>
                  <option value={12}>12%</option>
                  <option value={15}>15%</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2 rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-4">
                <label className="text-xs font-black uppercase tracking-wider text-[#181C20] flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#EAA228]" />
                  <span>Fondo de Caja Inicial Base para Apertura de Turnos ($ USD)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={defaultInitialCash}
                  onChange={(e) => setDefaultInitialCash(parseFloat(e.target.value) || 0)}
                  placeholder="50.00"
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-black text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none font-mono"
                />
                <p className="text-[11px] text-[#666E7A]">
                  Monto base sugerido con el que la cajera apertura la gaveta al iniciar el turno (antes de registrar la primera venta).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: OPERACIÓN & ALERTAS */}
        {activeTab === 'operacion' && (
          <div className="rounded-[28px] border border-[#EAE5DE] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-[#181C20]">Horarios y Alertas Sonoras</h2>
              <p className="text-xs text-[#666E7A]">Configura la dinámica operativa del salón y cocina.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#181C20] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#EAA228]" />
                  <span>Horario de Atención al Público</span>
                </label>
                <input
                  type="text"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder="Ej: Lunes a Sábado: 11:30 - 23:00 / Domingos: 12:00 - 18:00"
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-semibold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#181C20]">Zona Horaria del Sistema</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-bold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none"
                >
                  <option value="America/Guayaquil">Ecuador / Lima / Bogotá (UTC-5)</option>
                  <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                  <option value="America/Santiago">Santiago de Chile (UTC-3)</option>
                  <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
                  <option value="Europe/Madrid">España / Madrid (UTC+1)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4.5 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DE]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#EAA228]" />
                    <span className="text-xs font-extrabold text-[#181C20]">Timbre y Alertas de Sonido en Vivo</span>
                  </div>
                  <p className="text-[11px] text-[#666E7A]">
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
                  <div className="w-11 h-6 bg-[#D9D3C7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D9D3C7] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EAA228]"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: PIE DE TICKET */}
        {activeTab === 'ticket' && (
          <div className="rounded-[28px] border border-[#EAE5DE] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-[#181C20]">Personalización de Tickets Térmicos</h2>
              <p className="text-xs text-[#666E7A]">Personaliza el mensaje que sale impreso al final del comprobante de mesa.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-[#181C20]">Mensaje de Agradecimiento / Redes</label>
                <textarea
                  rows={4}
                  value={ticketFooter}
                  onChange={(e) => setTicketFooter(e.target.value)}
                  placeholder="¡Gracias por su visita! Síguenos en @tucuenta..."
                  className="w-full rounded-2xl border border-[#D9D3C7] bg-white p-3.5 text-xs font-semibold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:outline-none"
                />
                <p className="text-[11px] text-[#8C95A3]">Aparecerá centrado al final de cada recibo de 80mm y 58mm.</p>
              </div>

              {/* Vista previa en papel térmico */}
              <div className="rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-5 font-mono text-[11px] text-[#181C20] space-y-2 shadow-xs">
                <div className="text-center border-b border-dashed border-[#D9D3C7] pb-2">
                  <p className="font-extrabold text-xs uppercase text-[#181C20]">{name || 'Nombre del Restaurante'}</p>
                  <p className="text-[10px] text-[#666E7A]">{address}</p>
                  <p className="text-[10px] text-[#666E7A]">Tel: {phone}</p>
                </div>
                <div className="py-2 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>1x Cebiche Clásico</span>
                    <span className="font-bold">$12.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Bebida Refrescante</span>
                    <span className="font-bold">$3.00</span>
                  </div>
                  <div className="border-t border-dashed border-[#D9D3C7] pt-1 flex justify-between font-black text-xs">
                    <span>TOTAL:</span>
                    <span>$15.50</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-[#D9D3C7] pt-2 text-center text-[10px] text-[#666E7A] italic">
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
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#EAA228] hover:bg-[#D99318] px-7 text-xs font-black text-[#181C20] shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando ajustes...' : 'Guardar Todos los Cambios'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
