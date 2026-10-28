import { LoginForm } from '@/components/auth/login-form';
import { LoginCarousel } from '@/components/auth/login-carousel';
import { Suspense } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <section className="relative w-full max-w-4xl lg:max-w-5xl overflow-hidden rounded-[32px] border border-[#EAE5DE] bg-white shadow-[0_25px_60px_rgba(24,28,32,0.1)] flex flex-col md:flex-row items-stretch">
      {/* PANEL IZQUIERDO: CARRUSEL FOTOGRÁFICO ROTATIVO */}
      <LoginCarousel />

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

