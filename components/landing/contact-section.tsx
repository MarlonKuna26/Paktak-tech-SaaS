'use client';

import { useState } from 'react';
import { ArrowRight, MessageCircle, Check, Sparkles } from 'lucide-react';

export function ContactSection() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [message, setMessage] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    // Build WhatsApp message link for instant contact
    const text = `*Nueva consulta desde la web Paktak Tech*\n*Nombre:* ${fullName}\n*Correo:* ${email}\n*Local:* ${restaurantName || 'No especificado'}\n*Mensaje:* ${message || 'Deseo información'}`;
    const waUrl = `https://wa.me/593999999999?text=${encodeURIComponent(text)}`;
    
    setSubmitted(true);
    // Optionally open WhatsApp in a new tab
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
    }
  };

  return (
    <section id="contacto" className="py-20 md:py-28 bg-white border-t border-[#EAE5DE]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* =========================================================================
              COLUMNA IZQUIERDA: MENSAJE EDITORIAL Y ACCESO A WHATSAPP
          ========================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-black uppercase tracking-widest text-[#B87A14] block">
              07 / CONVERSEMOS
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#181C20] tracking-tight leading-[1.12]">
              La tecnología importa. <br className="hidden sm:inline" />
              La atención, también.
            </h2>

            <p className="text-base text-[#5A6370] leading-relaxed">
              ¿Quieres conocer Paktak Tech o necesitas soporte? Cuéntanos sobre tu local y lo que necesitas resolver.
            </p>

            <div className="pt-2 space-y-3">
              <a
                href="https://wa.me/593999999999?text=Hola,%20quisiera%20conversar%20con%20un%20asesor%20de%20Paktak%20Tech"
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 px-6 rounded-2xl border border-[#D9D3C7] bg-white text-sm font-bold text-[#181C20] hover:bg-[#FAF7F2] transition-colors inline-flex items-center gap-2.5 shadow-2xs group"
              >
                <span>Escríbenos por WhatsApp</span>
                <MessageCircle className="h-4 w-4 text-[#181C20] group-hover:text-[#25D366] transition-colors" />
              </a>

              <p className="text-xs text-[#7A8391] font-medium">
                O déjanos tu consulta en este formulario.
              </p>
            </div>
          </div>

          {/* =========================================================================
              COLUMNA DERECHA: FORMULARIO DE CONSULTA
          ========================================================================= */}
          <div className="lg:col-span-7">
            {submitted ? (
              <div className="rounded-[28px] border border-[#EBF7EE] bg-[#FAF7F2] p-8 sm:p-10 text-center space-y-4 animate-in fade-in duration-300">
                <div className="w-14 h-14 rounded-2xl bg-[#EBF7EE] text-[#1E7E34] flex items-center justify-center mx-auto shadow-xs">
                  <Check className="h-7 w-7 stroke-[2.5]" />
                </div>
                <h3 className="text-2xl font-black text-[#181C20]">
                  ¡Mensaje enviado con éxito!
                </h3>
                <p className="text-sm text-[#5A6370] max-w-md mx-auto leading-relaxed">
                  Gracias por escribirnos. Un asesor del equipo de Paktak Tech te responderá a la brevedad por WhatsApp o correo.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs font-bold text-[#B87A14] hover:underline"
                >
                  Enviar otra consulta
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4.5">
                {/* Fila 1: Nombre y Correo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#181C20]">
                      Tu nombre
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nombre y apellido"
                      className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-white text-sm text-[#181C20] placeholder-[#8C95A3] focus:outline-none focus:ring-2 focus:ring-[#EAA228] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#181C20]">
                      Tu correo
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nombre@tulocal.com"
                      className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-white text-sm text-[#181C20] placeholder-[#8C95A3] focus:outline-none focus:ring-2 focus:ring-[#EAA228] transition-all"
                    />
                  </div>
                </div>

                {/* Fila 2: Nombre del Local */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#181C20]">
                    Nombre del local
                  </label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="Tu restaurante o cafetería"
                    className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-white text-sm text-[#181C20] placeholder-[#8C95A3] focus:outline-none focus:ring-2 focus:ring-[#EAA228] transition-all"
                  />
                </div>

                {/* Fila 3: Mensaje */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#181C20]">
                    ¿En qué podemos ayudarte?
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Cuéntanos un poco más..."
                    className="w-full p-4 rounded-xl border border-[#D9D3C7] bg-white text-sm text-[#181C20] placeholder-[#8C95A3] focus:outline-none focus:ring-2 focus:ring-[#EAA228] transition-all resize-none"
                  />
                </div>

                {/* Checkbox de Privacidad */}
                <div className="flex items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="accept-terms"
                    required
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D9D3C7] text-[#181C20] focus:ring-[#EAA228] mt-0.5 cursor-pointer accent-[#181C20]"
                  />
                  <label
                    htmlFor="accept-terms"
                    className="text-xs text-[#5A6370] cursor-pointer select-none"
                  >
                    Acepto que Paktak Tech me contacte para responder esta consulta.
                  </label>
                </div>

                {/* Botón de Envío */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="h-12 px-8 rounded-xl bg-[#181C20] hover:bg-[#2A313A] text-white font-extrabold text-xs transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>Enviar consulta</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
