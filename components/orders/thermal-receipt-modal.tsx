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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-[28px] border border-[#EAE5DE] bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 font-sans">
        {/* Cabecera y Controles */}
        <div className="flex items-center justify-between border-b border-[#EAE5DE] pb-4 no-print">
          <div>
            <h3 className="font-extrabold text-base text-[#181C20] flex items-center gap-2">
              <Printer className="h-4 w-4 text-[#EAA228]" />
              <span>Ticket térmico / Orden</span>
            </h3>
            <p className="text-xs text-[#666E7A]">Compatible con impresoras de 58mm y 80mm</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setKitchenVisualMode(!kitchenVisualMode)}
              className={`h-9 px-3.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                kitchenVisualMode
                  ? 'bg-[#161A1E] text-[#EAA228]'
                  : 'border border-[#EAE5DE] bg-[#FAF7F2] text-[#181C20] hover:bg-[#F2ECE4]'
              }`}
            >
              {kitchenVisualMode ? 'Pantalla cocina' : 'Formato papel'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full border border-[#EAE5DE] flex items-center justify-center text-[#666E7A] hover:text-[#181C20] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Selector de Ancho de Papel */}
        {!kitchenVisualMode && (
          <div className="flex items-center justify-between text-xs border border-[#EAE5DE] rounded-2xl p-3 bg-[#FAF7F2] no-print">
            <span className="font-bold text-[#666E7A]">Ancho de papel térmico:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`h-8 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  paperWidth === '58mm'
                    ? 'bg-[#181C20] text-white shadow-xs'
                    : 'bg-white border border-[#EAE5DE] text-[#666E7A] hover:text-[#181C20]'
                }`}
              >
                58 mm (Portátil)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`h-8 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  paperWidth === '80mm'
                    ? 'bg-[#181C20] text-white shadow-xs'
                    : 'bg-white border border-[#EAE5DE] text-[#666E7A] hover:text-[#181C20]'
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
            <div className="w-full rounded-[24px] bg-[#161A1E] p-6 text-white space-y-4 border border-[#2D3540]">
              <div className="border-b border-[#2D3540] pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#EAA228]">Orden Cocina</span>
                  <h2 className="text-3xl font-black text-white">
                    {data.tableOrToken ? `${data.tableOrToken}` : `Orden #${data.orderNumber}`}
                  </h2>
                </div>
                <span className="text-sm font-mono text-[#8C95A3]">
                  {new Date(data.dateTime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="space-y-3">
                {data.items.map((it, idx) => (
                  <div key={idx} className="border-b border-[#2D3540]/60 pb-3">
                    <div className="flex items-baseline justify-between text-xl font-black text-white">
                      <span>
                        <span className="text-[#EAA228] text-2xl mr-2">{it.quantity}×</span>
                        {it.name}
                      </span>
                    </div>
                    {it.notes && (
                      <p className="mt-1 text-sm font-bold text-[#EAA228] bg-[#1E242B] border border-[#2D3540] p-2.5 rounded-xl">
                        Nota: {it.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {data.paymentStatus === 'pagado' && (
                <div className="text-center font-bold text-emerald-300 border border-emerald-500/30 bg-emerald-950/40 p-2.5 rounded-xl text-sm">
                  Pedido pagado ({data.paymentMethod || 'Caja'})
                </div>
              )}
            </div>
          ) : (
            /* Formato Papel Térmico Físico */
            <div
              className={`bg-white text-black p-4 font-mono text-xs shadow-xs border border-[#EAE5DE] rounded-2xl transition-all ${
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
        <div className="flex flex-wrap gap-2.5 pt-3 border-t border-[#EAE5DE] no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 h-12 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] font-black text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir ticket ({paperWidth})</span>
          </button>

          <button
            type="button"
            onClick={handleSendToChefWhatsApp}
            className="h-12 px-5 rounded-full border border-[#EAE5DE] bg-[#FAF7F2] text-[#181C20] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#F2ECE4] transition-colors shadow-2xs cursor-pointer"
          >
            <Send className="h-4 w-4 text-[#EAA228]" />
            <span>WhatsApp Cocina</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-12 px-5 rounded-full border border-[#EAE5DE] bg-white text-[#666E7A] font-bold text-sm hover:text-[#181C20] hover:bg-[#FAF7F2] transition-colors shadow-2xs cursor-pointer"
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
