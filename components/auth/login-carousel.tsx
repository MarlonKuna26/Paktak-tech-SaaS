'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Slide = {
  id: number;
  image: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
};

const slides: Slide[] = [
  {
    id: 0,
    image: '/images/login_banner.jpg',
    badge: 'Operación en tiempo real',
    title: 'Tu cocina tiene ritmo.',
    subtitle: 'Tu negocio, también.',
    description:
      'Comandas sincronizadas, pantalla KDS de cocina y arqueo diario automático sin perder un solo comensal.',
  },
  {
    id: 1,
    image: '/images/gourmet_dish.jpg',
    badge: 'Control de salón y barra',
    title: 'Mesas con rotación ágil',
    subtitle: 'y pedidos sin demoras.',
    description:
      'Cobro en mesa con tarjeta o efectivo, comandas directas a cocina y control de stock en tiempo real.',
  },
  {
    id: 2,
    image: '/images/restaurant_ambience.jpg',
    badge: 'Gestión inteligente',
    title: 'Visión 360° de tus ventas,',
    subtitle: 'costos y comensales.',
    description:
      'Métricas en vivo de tus platos más rentables, reservas digitales y arqueo de caja sin descuadres.',
  },
];

export function LoginCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play cada 4.5 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full md:w-[48%] relative min-h-[340px] sm:min-h-[400px] md:min-h-[580px] flex flex-col justify-between p-6 sm:p-8 md:p-9 text-white overflow-hidden bg-[#161A1E]">
      {/* 3 Imágenes con Cross-Fade suave */}
      {slides.map((s, idx) => (
        <img
          key={s.id}
          src={s.image}
          alt={s.title}
          className={`absolute inset-0 w-full h-full object-cover select-none transition-all duration-1000 ease-in-out ${
            currentSlide === idx
              ? 'opacity-100 scale-100 z-0'
              : 'opacity-0 scale-105 pointer-events-none -z-10'
          }`}
          loading={idx === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {/* Degradado oscuro para máxima legibilidad tipográfica */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#161A1E]/95 via-[#161A1E]/50 to-[#161A1E]/20 pointer-events-none z-1" />

      {/* Cabecera superior izquierda */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#EAA228] text-[#181C20] flex items-center justify-center font-black text-base shadow-sm group-hover:scale-105 transition-transform">
            P
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white drop-shadow-md">
            Paktak Tech
          </span>
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 px-3 py-1 text-[11px] font-bold text-[#EAA228]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#EAA228] animate-pulse" />
          <span>SaaS Gastronómico</span>
        </span>
      </div>

      {/* Bloque inferior con tipografía dinámica y transición */}
      <div className="relative z-10 space-y-3 pt-12 md:pt-0">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-3 py-1 text-[11px] font-extrabold text-[#EAA228] transition-all">
          <span>{slides[currentSlide].badge}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-white leading-[1.14] tracking-tight drop-shadow-md min-h-[66px] sm:min-h-[76px] transition-all">
          {slides[currentSlide].title} <br />
          {slides[currentSlide].subtitle}
        </h2>

        <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed max-w-sm drop-shadow-sm font-medium min-h-[38px] transition-all">
          {slides[currentSlide].description}
        </p>

        {/* 3 Indicadores interactivos del carrusel */}
        <div className="flex items-center gap-2 pt-2">
          {slides.map((s, idx) => {
            const isActive = currentSlide === idx;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'w-8 bg-[#EAA228] shadow-[0_0_10px_rgba(234,162,40,0.5)]'
                    : 'w-2 bg-white/40 hover:bg-white/80'
                }`}
                aria-label={`Ver imagen ${idx + 1}: ${s.badge}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
