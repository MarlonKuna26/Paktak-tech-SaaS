'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 1,
    question: '¿Necesito una tarjeta para empezar?',
    answer:
      'No. Activa una prueba gratuita de 14 días y conoce el flujo de tu local antes de elegir un plan.',
  },
  {
    id: 2,
    question: '¿Qué pasa si el mesero se queda sin internet?',
    answer:
      'El comandero conserva los pedidos pendientes y los sincroniza sin duplicarlos al recuperar la conexión.',
  },
  {
    id: 3,
    question: '¿Puedo cobrar antes o después de servir?',
    answer:
      'Sí. Configura atención prepago o postpago según la operación de tu restaurante o cafetería.',
  },
  {
    id: 4,
    question: '¿Cómo empiezo con mi local?',
    answer:
      'Configura los datos del negocio, tus mesas y las categorías de tu carta. Luego crea tu cuenta owner y activa la prueba.',
  },
];

export function FaqSection() {
  // Allow multiple or single open; by default in the image all 4 are visible
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([1, 2, 3, 4]));

  const toggleItem = (id: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#FAF7F2] border-t border-[#EAE5DE]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* =========================================================================
              COLUMNA IZQUIERDA: CABECERA EDITORIAL
          ========================================================================= */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-[#B87A14] block">
              06 / ANTES DE EMPEZAR
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#181C20] tracking-tight leading-[1.12]">
              Las dudas, sobre la <br className="hidden sm:inline" />
              mesa.
            </h2>

            <p className="text-base text-[#5A6370] leading-relaxed">
              Lo importante para dar el primer paso con tranquilidad.
            </p>
          </div>

          {/* =========================================================================
              COLUMNA DERECHA: TARJETAS DE PREGUNTAS FRECUENTES
          ========================================================================= */}
          <div className="lg:col-span-7 space-y-4">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openItems.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="rounded-[22px] bg-white border border-[#EAE5DE] p-5 sm:p-6 shadow-2xs hover:border-[#D9D3C7] transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-extrabold text-base sm:text-lg text-[#181C20] tracking-tight">
                      {item.question}
                    </h3>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#181C20] shrink-0">
                      {isOpen ? (
                        <Minus className="h-4 w-4 stroke-[2.5]" />
                      ) : (
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <p className="mt-3 text-xs sm:text-sm text-[#5A6370] leading-relaxed animate-in fade-in duration-200">
                      {item.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
