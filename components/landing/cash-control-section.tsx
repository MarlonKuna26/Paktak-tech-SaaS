import { Check, Wallet } from 'lucide-react';

export function CashControlSection() {
  return (
    <section id="control-caja" className="py-20 md:py-28 bg-[#FAF7F2] border-t border-[#EAE5DE]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* =========================================================================
              COLUMNA IZQUIERDA: TARJETA "TU CAJA, SIN PUNTOS CIEGOS"
          ========================================================================= */}
          <div className="lg:col-span-6">
            <div className="rounded-[28px] border border-[#E5DFD7] bg-white p-6 sm:p-8 md:p-9 shadow-[0_12px_36px_rgba(24,28,32,0.06)] space-y-5">
              {/* Encabezado de la Tarjeta */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#181C20] tracking-tight">
                    Tu caja, sin puntos ciegos.
                  </h3>
                  <p className="text-xs text-[#7A8391] font-medium mt-1">
                    Café de la Plaza · Hoy · Datos de ejemplo
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#EAE5DE] flex items-center justify-center text-[#181C20] shrink-0">
                  <Wallet className="h-5 w-5 text-[#181C20]" />
                </div>
              </div>

              {/* Ventas Netas Destacadas */}
              <div className="pt-2 pb-4 border-b border-[#EAE5DE] flex items-baseline justify-between">
                <span className="text-xs font-bold text-[#666E7A]">Ventas netas</span>
                <span className="text-3xl sm:text-4xl font-black text-[#181C20] tracking-tight">
                  $1.248,00
                </span>
              </div>

              {/* Desglose por Medio de Pago */}
              <div className="space-y-3 pt-1 text-sm font-semibold text-[#181C20]">
                <div className="flex items-center justify-between">
                  <span className="text-[#555E6B]">Efectivo en ventas</span>
                  <span className="font-bold text-[#181C20]">$480,00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#555E6B]">Transferencias</span>
                  <span className="font-bold text-[#181C20]">$312,00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#555E6B]">Tarjetas</span>
                  <span className="font-bold text-[#181C20]">$456,00</span>
                </div>
              </div>

              {/* Cuadro Destacado: Efectivo Físico Esperado */}
              <div className="rounded-2xl bg-[#EBF7EE] border border-[#28A745]/20 p-4 sm:p-5 flex items-center justify-between mt-3">
                <div className="space-y-1">
                  <span className="block text-sm font-black text-[#1E7E34]">
                    Efectivo físico esperado
                  </span>
                  <span className="block text-[11px] font-bold text-[#28A745]">
                    $100 apertura + $480 ventas − $40 salida
                  </span>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-[#1E7E34] tracking-tight">
                  $540,00
                </span>
              </div>

              {/* Pie de tarjeta */}
              <div className="pt-2 text-xs text-[#7A8391] font-medium">
                64 pedidos · Ticket promedio $19,50
              </div>
            </div>
          </div>

          {/* =========================================================================
              COLUMNA DERECHA: TEXTO EDITORIAL Y ROLES
          ========================================================================= */}
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-black uppercase tracking-widest text-[#B87A14] block">
              04 / EL CONTROL TAMBIÉN SE SIRVE
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#181C20] tracking-tight leading-[1.12]">
              Cierra el día. Abre <br className="hidden sm:inline" />
              posibilidades.
            </h2>

            <p className="text-base text-[#5A6370] leading-relaxed">
              Distingue el efectivo que debe estar en caja de lo que llegó por tarjeta o transferencia. Consulta platos estrella, horas pico y reportes para decidir con contexto.
            </p>

            {/* Característica Principal */}
            <div className="flex items-start gap-3.5 pt-2">
              <div className="h-6 w-6 rounded-full bg-[#EBF7EE] text-[#1E7E34] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-[#181C20]">
                  Del cobro al corte
                </h4>
                <p className="text-xs sm:text-sm text-[#666E7A] mt-0.5">
                  Efectivo y cambio, tickets de 80 mm, propinas y exportación CSV.
                </p>
              </div>
            </div>

            {/* Chips de Roles */}
            <div className="pt-4 space-y-3">
              <span className="text-xs font-bold text-[#181C20] block">
                Cada persona, en su rol.
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {['Owner', 'Mesero', 'Cocina', 'Cajero', 'Anfitrión'].map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-white border border-[#EAE5DE] px-4 py-1.5 text-xs font-bold text-[#444C57] shadow-2xs hover:border-[#EAA228] transition-colors"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
