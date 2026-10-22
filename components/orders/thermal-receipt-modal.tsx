'use client';

import { useState } from 'react';
import { Printer, X, Send } from 'lucide-react';

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
  paidCents?: number;
  changeCents?: number;
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
    let msg = `*ORDEN DE COCINA*\n`;
    msg += `*Ubicacion:* ${data.tableOrToken ? `${data.tableOrToken}` : 'Mostrador'}\n`;
    if (data.orderNumber) msg += `*Orden:* #${data.orderNumber}\n`;
    msg += `*Hora:* ${new Date(data.dateTime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}\n`;
    msg += `--------------------------\n`;
    for (const it of data.items) {
      msg += `*${it.quantity}x* ${it.name}\n`;
      if (it.notes) msg += `   Nota: ${it.notes}\n`;
    }
    msg += `--------------------------\n`;
    if (data.paymentStatus === 'pagado') {
      msg += `*PAGADO* (${data.paymentMethod || 'Caja'})\n`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-[24px] border border-[#E8E8E8] bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Cabecera y Controles */}
        <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-4 no-print">
          <div>
            <h3 className="font-extrabold text-base text-[#1A1A1A] flex items-center gap-2">
              <Printer className="h-4 w-4" />
              <span>Ticket térmico / Orden</span>
            </h3>
            <p className="text-xs text-[#6B6B6B]">Compatible con impresoras de 58mm y 80mm</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setKitchenVisualMode(!kitchenVisualMode)}
              className={`h-9 px-3.5 rounded-full text-xs font-bold transition-colors ${
                kitchenVisualMode
                  ? 'bg-[#1A1A1A] text-white'
                  : 'border border-[#E8E8E8] bg-white text-[#1A1A1A] hover:bg-[#F7F7F7]'
              }`}
            >
              {kitchenVisualMode ? 'Pantalla cocina' : 'Formato papel'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full border border-[#E8E8E8] flex items-center justify-center text-[#1A1A1A] hover:bg-[#F7F7F7]"
              aria-label="Cerrar modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Selector de Ancho de Papel */}
        {!kitchenVisualMode && (
          <div className="flex items-center justify-between text-xs border border-[#E8E8E8] rounded-2xl p-3 bg-[#F7F7F7] no-print">
            <span className="font-semibold text-[#6B6B6B]">Ancho de papel térmico:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`h-8 px-3 rounded-full text-xs font-bold transition-colors ${
                  paperWidth === '58mm'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-[#E8E8E8] text-[#1A1A1A]'
                }`}
              >
                58 mm (Portátil)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`h-8 px-3 rounded-full text-xs font-bold transition-colors ${
                  paperWidth === '80mm'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-[#E8E8E8] text-[#1A1A1A]'
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
            /* Pantalla Gigante para que el cocinero lo lea desde lejos */
            <div className="w-full rounded-[24px] bg-[#111111] p-6 text-white space-y-4 border border-[#2E2E2E]">
              <div className="border-b border-[#2E2E2E] pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">Orden Cocina</span>
                  <h2 className="text-3xl font-extrabold text-white">
                    {data.tableOrToken ? `${data.tableOrToken}` : `Orden #${data.orderNumber}`}
                  </h2>
                </div>
                <span className="text-base font-mono text-[#A1A1AA]">
                  {new Date(data.dateTime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="space-y-3">
                {data.items.map((it, idx) => (
                  <div key={idx} className="border-b border-[#222222] pb-3">
                    <div className="flex items-baseline justify-between text-xl font-black text-white">
                      <span>
                        <span className="text-[#FFC21A] text-2xl mr-2">{it.quantity}×</span>
                        {it.name}
                      </span>
                    </div>
                    {it.notes && (
                      <p className="mt-1 text-sm font-semibold text-[#FFC21A] bg-[#222222] p-2 rounded-xl">
                        Nota: {it.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {data.paymentStatus === 'pagado' && (
                <div className="text-center font-bold text-[#BBF7D0] border border-[#15803D]/30 bg-[#15803D]/10 p-2.5 rounded-xl text-sm">
                  Pedido pagado ({data.paymentMethod || 'Caja'})
                </div>
              )}
            </div>
          ) : (
            /* Formato Papel Térmico Físico */
            <div
              className={`bg-white text-black p-4 font-mono text-xs shadow-sm border border-[#E8E8E8] rounded-xl transition-all ${
                paperWidth === '58mm' ? 'w-[260px]' : 'w-[340px]'
              }`}
              id="thermal-receipt"
            >
              <div className="text-center border-b border-dashed border-black pb-2 space-y-1">
                <p className="font-bold text-sm tracking-wider uppercase">
                  {data.restaurantName || 'PAKTAK RESTAURANTE'}
                </p>
                <p className="text-[10px]">TICKET DE ORDEN</p>
                <p className="font-extrabold text-base">
                  {data.tableOrToken ? `${data.tableOrToken}` : `ORDEN #${data.orderNumber}`}
                </p>
                <p className="text-[10px]">
                  {new Date(data.dateTime).toLocaleString('es-EC', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
                {data.waiterName && <p className="text-[10px]">Atendido por: {data.waiterName}</p>}
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
                  <p className="font-bold">PAGADO ({data.paymentMethod || 'Efectivo'})</p>
                ) : (
                  <p className="font-bold">CUENTA PENDIENTE</p>
                )}
                <p className="text-[9px] text-neutral-600">Paktak Tech SaaS</p>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-wrap gap-2.5 pt-3 border-t border-[#E8E8E8] no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 h-12 rounded-full bg-[#FFC21A] text-[#1A1A1A] font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir ticket ({paperWidth})</span>
          </button>

          <button
            type="button"
            onClick={handleSendToChefWhatsApp}
            className="h-12 px-5 rounded-full border border-[#E8E8E8] bg-white text-[#1A1A1A] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#F7F7F7] transition-colors"
          >
            <Send className="h-4 w-4" />
            <span>WhatsApp Cocina</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-12 px-5 rounded-full border border-[#E8E8E8] bg-white text-[#1A1A1A] font-bold text-sm hover:bg-[#F7F7F7]"
          >
            Cerrar
          </button>
        </div>
      </div>

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
