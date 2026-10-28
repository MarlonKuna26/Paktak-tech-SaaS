import { LoginForm } from '@/components/auth/login-form';
import { Suspense } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <section className="relative w-full max-w-4xl lg:max-w-5xl overflow-hidden rounded-[32px] border border-[#EAE5DE] bg-white shadow-[0_25px_60px_rgba(24,28,32,0.1)] flex flex-col md:flex-row items-stretch">
      {/* =========================================================================
          PANEL IZQUIERDO: BANNER FOTOGRÁFICO GASTRONÓMICO (INSPIRADO EN LA REFERENCIA)
      ========================================================================= */}
      <div className="w-full md:w-[48%] relative min-h-[300px] sm:min-h-[360px] md:min-h-[560px] flex flex-col justify-between p-6 sm:p-8 md:p-9 text-white overflow-hidden bg-[#161A1E]">
        {/* Fotografía de alta calidad */}
        <img
          src="/images/login_banner.jpg"
          alt="Gastronomía artesanal Paktak Tech"
          className="absolute inset-0 w-full h-full object-cover select-none"
          loading="eager"
        />

        {/* Degradado oscuro para máxima legibilidad tipográfica */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#161A1E]/95 via-[#161A1E]/40 to-[#161A1E]/20 pointer-events-none" />

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

        {/* Bloque inferior con tipografía editorial (como en la referencia) */}
        <div className="relative z-10 space-y-3 pt-12 md:pt-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-3 py-1 text-[11px] font-extrabold text-[#EAA228]">
            <span>Operación en tiempo real</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-white leading-[1.12] tracking-tight drop-shadow-md">
            Tu cocina tiene ritmo. <br />
            Tu negocio, también.
          </h2>

          <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed max-w-sm drop-shadow-sm font-medium">
            Comandas sincronizadas, pantalla KDS de cocina y arqueo diario automático sin perder un solo comensal.
          </p>

          {/* Indicadores de carrusel (idénticos a la referencia) */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="h-1.5 w-7 rounded-full bg-[#EAA228]" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          PANEL DERECHO: FORMULARIO DE ACCESO Y ACCESO RÁPIDO
      ========================================================================= */}
      <div className="w-full md:w-[52%] p-7 sm:p-9 md:p-10 flex flex-col justify-between bg-white relative">
        {/* Glow ámbar suave decorativo */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#EAA228]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#B87A14]">
              Acceso al sistema
            </span>
            <span className="inline-flex items-center rounded-full bg-[#FAF7F2] border border-[#EAE5DE] px-2.5 py-1 text-[10px] font-bold text-[#666E7A] tracking-wider uppercase">
              Portal Seguro
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#181C20]">
              Iniciar sesión
            </h1>
            <p className="text-xs text-[#666E7A] leading-relaxed">
              Ingresa con tu correo asignado para acceder a comandas, cocina, salón y reportes.
            </p>
          </div>
        </div>

        <div className="relative z-10 py-3">
          <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-[#8C95A3]">Cargando formulario...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <div className="pt-3 border-t border-[#EAE5DE] text-center relative z-10">
          <p className="text-xs text-[#666E7A]">
            ¿Aún no tienes cuenta?{' '}
            <Link href="/onboarding" className="font-black text-[#EAA228] hover:text-[#D99318] hover:underline transition-colors">
              Crear restaurante (14 días gratis)
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

