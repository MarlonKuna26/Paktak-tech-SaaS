'use client';

import { useState } from 'react';

export type ThermalPrintData = {
  restaurantName?: string;
  orderNumber?: string | number;
  tableOrToken?: string | number;
  serviceType?: string;
  waiterName?: string;
  customerName?: string;
  dateTime: string;
  items: Array<{
    name: string;
    quantity: number;
    priceCents?: number;
    notes?: string | null;
  }>;
  totalCents?: number;
  paymentStatus?: string;
  paymentMethod?: string | null;
};

export function ThermalReceiptModal({
  data,
  onClose,
}: {
  data: ThermalPrintData;
  onClose: () => void;
}) {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [kitchenVisualMode, setKitchenVisualMode] = useState(false);

  function handlePrint() {
    window.print();
  }

  function handleSendToChefWhatsApp() {
    let msg = `👨‍🍳 *COMANDA COCINA*\n`;
    msg += `📍 *Ubicación:* ${data.tableOrToken ? `${data.tableOrToken}` : 'Mostrador'}\n`;
    if (data.orderNumber) msg += `🔖 *Orden:* #${data.orderNumber}\n`;
    msg += `⏰ *Hora:* ${new Date(data.dateTime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}\n`;
    msg += `--------------------------\n`;
    for (const it of data.items) {
      msg += `▪️ *${it.quantity}×* ${it.name}\n`;
      if (it.notes) msg += `   ↳ _Nota: ${it.notes}_\n`;
    }
    msg += `--------------------------\n`;
    if (data.paymentStatus === 'pagado') {
      msg += `✅ *PAGADO* (${data.paymentMethod || 'Caja'})\n`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Cabecera y Controles */}
        <div className="flex items-center justify-between border-b pb-3 no-print">
          <div>
            <h3 className="font-bold text-base flex items-center gap-1.5">
              <span>🖨️</span> Ticket Térmico / Comanda
            </h3>
            <p className="text-xs text-muted-foreground">Compatible con papel de 58mm y 80mm</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setKitchenVisualMode(!kitchenVisualMode)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                kitchenVisualMode
                  ? 'bg-amber-500 text-black'
                  : 'border bg-background hover:bg-muted text-muted-foreground'
              }`}
            >
              {kitchenVisualMode ? '📱 Modo Pantalla Cocina' : '📄 Formato Papel'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Selector de Ancho de Papel */}
        {!kitchenVisualMode && (
          <div className="flex items-center justify-between text-xs border rounded-lg p-2 bg-muted/20 no-print">
            <span className="font-medium text-muted-foreground">Ancho de papel térmico:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`rounded px-2 py-0.5 font-bold ${
                  paperWidth === '58mm'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                58 mm (Portátil)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`rounded px-2 py-0.5 font-bold ${
                  paperWidth === '80mm'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                80 mm (Caja/Cocina)
              </button>
            </div>
          </div>
        )}

        {/* Vista Previa del Ticket / Comanda Visual */}
        <div className="flex-1 overflow-y-auto p-2 flex justify-center">
          {kitchenVisualMode ? (
            /* MODO APAGÓN: Pantalla Gigante para que el cocinero lo lea desde lejos */
            <div className="w-full rounded-2xl bg-black p-5 text-amber-400 space-y-4 border border-amber-500/40">
              <div className="border-b border-amber-500/30 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-widest text-amber-500/80">Comanda Cocina</span>
                  <h2 className="text-3xl font-extrabold text-white">
                    {data.tableOrToken ? `${data.tableOrToken}` : `Orden #${data.orderNumber}`}
                  </h2>
                </div>
                <span className="text-lg font-mono text-amber-300">
                  {new Date(data.dateTime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="space-y-3">
                {data.items.map((it, idx) => (
                  <div key={idx} className="border-b border-zinc-800 pb-2">
                    <div className="flex items-baseline justify-between text-xl font-black text-white">
                      <span>
                        <span className="text-amber-400 text-2xl mr-2">{it.quantity}×</span>
                        {it.name}
                      </span>
                    </div>
                    {it.notes && (
                      <p className="mt-1 text-sm font-bold text-amber-300 bg-amber-950/60 p-1.5 rounded-lg border border-amber-500/30">
                        ⚠️ NOTA: {it.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {data.paymentStatus === 'pagado' && (
                <div className="text-center font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-950/40 p-2 rounded-lg text-sm">
                  ✓ PEDIDO PAGADO ({data.paymentMethod || 'Caja'})
                </div>
              )}
            </div>
          ) : (
            /* FORMATO PAPEL TÉRMICO FÍSICO (58mm o 80mm) */
            <div
              className={`bg-white text-black p-4 font-mono text-xs shadow-md border rounded-lg transition-all ${
                paperWidth === '58mm' ? 'w-[260px]' : 'w-[340px]'
              }`}
              id="thermal-receipt"
            >
              <div className="text-center border-b border-dashed border-black pb-2 space-y-1">
                <p className="font-bold text-sm tracking-wider uppercase">
                  {data.restaurantName || 'PAKTAK RESTAURANTE'}
                </p>
                <p className="text-[10px]">TICKET DE COMANDA</p>
                <p className="font-extrabold text-base">
                  {data.tableOrToken ? `${data.tableOrToken}` : `ORDEN #${data.orderNumber}`}
                </p>
                <p className="text-[10px]">
                  {new Date(data.dateTime).toLocaleString('es-EC', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
                {data.waiterName && <p className="text-[10px]">Mesero: {data.waiterName}</p>}
                {data.customerName && <p className="text-[10px]">Cliente: {data.customerName}</p>}
              </div>

              <div className="py-2 space-y-1.5 border-b border-dashed border-black">
                {data.items.map((it, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between font-bold">
                      <span>{it.quantity} × {it.name}</span>
                      {it.priceCents !== undefined && (
                        <span>${((it.priceCents * it.quantity) / 100).toFixed(2)}</span>
                      )}
                    </div>
                    {it.notes && (
                      <p className="text-[10px] italic pl-2 font-bold text-neutral-800">
                        * {it.notes} *
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {data.totalCents !== undefined && (
                <div className="pt-2 text-right font-extrabold text-sm border-b border-dashed border-black pb-2">
                  <span>TOTAL: ${(data.totalCents / 100).toFixed(2)}</span>
                </div>
              )}

              <div className="text-center pt-2 text-[10px] space-y-0.5">
                {data.paymentStatus === 'pagado' ? (
                  <p className="font-bold">✓ PAGADO ({data.paymentMethod || 'Efectivo'})</p>
                ) : (
                  <p className="font-bold">*** CUENTA PENDIENTE ***</p>
                )}
                <p className="text-[9px] text-neutral-600">Paktak Tech SaaS</p>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-wrap gap-2 pt-2 border-t no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 shadow transition-colors"
          >
            <span>🖨️</span> Imprimir Ticket ({paperWidth})
          </button>

          <button
            type="button"
            onClick={handleSendToChefWhatsApp}
            className="h-10 px-3 rounded-xl bg-[#25D366] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 shadow transition-colors"
            title="Enviar comanda por WhatsApp al chef"
          >
            <span>📲</span> WhatsApp Chef
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl border bg-background font-semibold text-xs hover:bg-muted"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Estilos de Impresión Térmica Directa (@media print) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt,
          #thermal-receipt * {
            visibility: visible;
          }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
            font-size: ${paperWidth === '58mm' ? '10px' : '12px'} !important;
            color: black !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
