import Link from 'next/link';
import {
  Smartphone,
  Users,
  ChefHat,
  CreditCard,
  Armchair,
  Wifi,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  Check,
  CheckCircle2,
  MessageCircle,
  Clock,
  Bell,
  Sparkles,
  ShieldCheck,
  Zap,
  Store,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { CashControlSection } from '@/components/landing/cash-control-section';
import { FaqSection } from '@/components/landing/faq-section';
import { ContactSection } from '@/components/landing/contact-section';
import { ActiveOrderFloatingBanner } from '@/components/orders/active-order-floating-banner';

export const metadata = {
  title: 'Paktak Tech | Tu cocina tiene ritmo. Tu negocio, también.',
  description:
    'Software gastronómico integral: menú digital, comandero offline para meseros, pantalla KDS de cocina en tiempo real y arqueo de caja automático.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#181C20] selection:bg-[#EAA228] selection:text-[#181C20]">
      <ActiveOrderFloatingBanner />
      {/* =========================================================================
          1. HEADER / NAVBAR STICKY
      ========================================================================= */}
      <header className="sticky top-0 z-50 h-16 md:h-[74px] bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EAE5DE] transition-colors">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#EAA228] text-[#181C20] flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg leading-tight tracking-tight text-[#181C20]">
                Paktak Tech
              </span>
              <span className="text-[11px] font-semibold text-[#666E7A]">
                SaaS Gastronómico
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-bold text-[#555E6B]">
            <a href="#modulos" className="hover:text-[#181C20] transition-colors">
              Módulos
            </a>
            <a href="#control-caja" className="hover:text-[#181C20] transition-colors">
              Control Caja
            </a>
            <a href="#kds" className="hover:text-[#181C20] transition-colors">
              Cocina KDS
            </a>
            <a href="#precios" className="hover:text-[#181C20] transition-colors">
              Precios
            </a>
            <a href="#faq" className="hover:text-[#181C20] transition-colors">
              Dudas
            </a>
            <a href="#contacto" className="hover:text-[#181C20] transition-colors">
              Contacto
            </a>
            <Link
              href="/restaurante-prueba-a/pedir"
              target="_blank"
              className="hover:text-[#181C20] flex items-center gap-1.5 transition-colors"
            >
              <span>Demo</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#EAA228]" />
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="h-10 px-4 rounded-full text-sm font-bold text-[#181C20] hover:bg-[#EAE5DE]/60 flex items-center justify-center transition-colors"
            >
              Ingresar
            </Link>
            <Link
              href="/onboarding"
              className="h-10 md:h-11 px-5 rounded-full bg-[#EAA228] text-[#181C20] font-extrabold text-sm hover:bg-[#D99318] shadow-sm hover:shadow flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Prueba gratis</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION CON EL MOCKUP COMPUESTO (DASHBOARD + CELULAR)
      ========================================================================= */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
          {/* Hero Header */}
          <div className="text-center max-w-3xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E5DFD7] bg-[#F3EFE8] px-4 py-1.5 text-xs font-bold text-[#444C57]">
              <Sparkles className="h-3.5 w-3.5 text-[#EAA228]" />
              <span>Hospitalidad humana · Precisión conectada</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#181C20] leading-[1.08]">
              Tu cocina tiene ritmo.{' '}
              <span className="block text-[#181C20]">Tu negocio, también.</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-[#5A6370] max-w-2xl mx-auto leading-relaxed font-medium">
              Software gastronómico integral: mesas sincronizadas en vivo, comanda de meseros sin depender de internet, pantalla KDS para cocineros y arqueo diario automático.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Link
                href="/onboarding"
                className="w-full sm:w-auto h-13 md:h-14 px-8 rounded-full bg-[#EAA228] text-[#181C20] font-extrabold text-base hover:bg-[#D99318] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5"
              >
                <span>Empezar prueba gratis de 14 días</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/restaurante-prueba-a/pedir"
                target="_blank"
                className="w-full sm:w-auto h-13 md:h-14 px-7 rounded-full border border-[#D9D3C7] bg-white text-[#181C20] font-extrabold text-base hover:bg-[#F6F2EB] shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Ver demostración en vivo</span>
                <ExternalLink className="h-4 w-4 text-[#8C95A3]" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs font-semibold text-[#666E7A] pt-2">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#EAA228]" /> Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#EAA228]" /> Activación en 3 minutos
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#EAA228]" /> Soporte por WhatsApp
              </span>
            </div>
          </div>

          {/* =====================================================================
              HERO VISUAL MOCKUP: GRAN IMAGEN SHOWCASE DEL SAAS GASTRONÓMICO
          ===================================================================== */}
          <div className="mt-12 md:mt-16 relative max-w-5xl mx-auto">
            {/* Ambient Warm Golden Glow behind mockup */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-[#EAA228]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Main Showcase Device / Window Frame */}
            <div className="relative rounded-[28px] sm:rounded-[36px] border border-[#E5DFD7] bg-[#161A1E] shadow-[0_30px_90px_rgba(24,28,32,0.16)] overflow-hidden group">
              {/* Window Header Bar */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#1E242B] border-b border-[#2D3540]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
                  </div>
                  <span className="hidden sm:inline-block text-[11px] font-bold text-[#8C95A3] ml-3">
                    paktak.tech · Torre de Control Gastronómica
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    14 Mesas en vivo · Cocina KDS activa
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] font-bold text-zinc-300">
                    <Wifi className="h-3 w-3 text-[#EAA228]" /> 100% Offline-Ready
                  </span>
                </div>
              </div>

              {/* Gran Imagen Principal de Alto Impacto */}
              <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#161A1E]">
                <img
                  src="/images/hero_saas_showcase.jpg"
                  alt="Paktak Tech - Software gastronómico en acción"
                  className="w-full h-full object-cover select-none group-hover:scale-[1.015] transition-transform duration-700 ease-out"
                  loading="eager"
                />

                {/* Floating Badge 1: Comanda en marcha (Top-Left) */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 max-w-[260px] sm:max-w-xs rounded-2xl bg-white/95 backdrop-blur-md p-3 sm:p-3.5 shadow-2xl border border-[#EAE5DE] flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#181C20] truncate">
                      Comanda #104 en cocina
                    </p>
                    <p className="text-[11px] text-[#666E7A] truncate">
                      Mesa 04 · 3 Platos · Sync 0.8s
                    </p>
                  </div>
                </div>

                {/* Floating Badge 2: Métricas del día (Bottom-Right) */}
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-10 max-w-[280px] sm:max-w-xs rounded-2xl bg-[#181C20]/95 backdrop-blur-md p-3 sm:p-3.5 shadow-2xl border border-white/15 text-white flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAA228]/20 text-[#EAA228]">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-black text-white">
                        $2,840.50
                      </span>
                      <span className="text-[10px] font-extrabold text-[#28A745] bg-[#28A745]/20 px-1.5 py-0.5 rounded-sm">
                        +22%
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 truncate">
                      Ventas turno · Arqueo cuadrado
                    </p>
                  </div>
                </div>

                {/* Floating Badge 3: KDS Cocina (Bottom-Left - desktop) */}
                <div className="hidden md:flex absolute bottom-6 left-6 z-10 rounded-2xl bg-white/95 backdrop-blur-md p-3 shadow-2xl border border-[#EAE5DE] items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAA228]/20 text-[#181C20] font-black text-xs">
                    ⚡
                  </span>
                  <div>
                    <p className="text-[11px] font-black text-[#181C20]">
                      Despacho Promedio: 11m 40s
                    </p>
                    <p className="text-[10px] text-[#666E7A]">
                      Optimizado sin comandas perdidas
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Feature Highlights Strip beneath Image */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6">
              <div className="rounded-2xl border border-[#E5DFD7] bg-white p-4 shadow-xs hover:border-[#EAA228] transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#EAA228]">01</span>
                  <span className="text-xs font-extrabold text-[#181C20]">Salón & Mesas</span>
                </div>
                <p className="text-[11px] text-[#666E7A] mt-1 leading-snug">
                  Plano interactivo con rotación ágil y cobro en mesa.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5DFD7] bg-white p-4 shadow-xs hover:border-[#EAA228] transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#EAA228]">02</span>
                  <span className="text-xs font-extrabold text-[#181C20]">KDS Cocina</span>
                </div>
                <p className="text-[11px] text-[#666E7A] mt-1 leading-snug">
                  Pantalla táctil que elimina papel y demoras de cocineros.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5DFD7] bg-white p-4 shadow-xs hover:border-[#EAA228] transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#EAA228]">03</span>
                  <span className="text-xs font-extrabold text-[#181C20]">Control de Caja</span>
                </div>
                <p className="text-[11px] text-[#666E7A] mt-1 leading-snug">
                  Arqueo ciego diario y corte X/Z sin margen de fuga.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5DFD7] bg-white p-4 shadow-xs hover:border-[#EAA228] transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#EAA228]">04</span>
                  <span className="text-xs font-extrabold text-[#181C20]">Menú Digital QR</span>
                </div>
                <p className="text-[11px] text-[#666E7A] mt-1 leading-snug">
                  Carta interactiva directa para clientes en mesa y delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. LOS 4 PILARES DEL SISTEMA (CARDS CON DISEÑO MODERNO)
      ========================================================================= */}
      <section id="modulos" className="py-20 md:py-28 bg-white border-y border-[#EAE5DE]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#EAA228]">
              Flujo de punta a punta
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#181C20] tracking-tight">
              Diseñado para el calor del servicio real
            </h2>
            <p className="text-sm md:text-base text-[#5A6370] leading-relaxed">
              Cada componente se conecta en tiempo real para que ningún pedido se pierda, ninguna mesa espere de más y la caja cuadre siempre.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pilar 1 */}
            <div className="rounded-[24px] border border-[#EAE5DE] bg-[#FAF7F2] p-7 space-y-4 hover:border-[#EAA228] transition-all hover:shadow-md group">
              <div className="h-12 w-12 rounded-2xl bg-white border border-[#EAE5DE] flex items-center justify-center text-[#181C20] group-hover:bg-[#EAA228] group-hover:text-[#181C20] transition-colors">
                <Armchair className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#181C20]">
                Mesa abierta, flujo cerrado
              </h3>
              <p className="text-xs md:text-sm text-[#5A6370] leading-relaxed">
                Visualiza el plano de salón con tiempos de permanencia, control de ocupación y bloqueo de liberación accidental hasta que la comida esté servida.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="rounded-[24px] border border-[#EAE5DE] bg-[#FAF7F2] p-7 space-y-4 hover:border-[#EAA228] transition-all hover:shadow-md group">
              <div className="h-12 w-12 rounded-2xl bg-white border border-[#EAE5DE] flex items-center justify-center text-[#181C20] group-hover:bg-[#EAA228] group-hover:text-[#181C20] transition-colors">
                <Wifi className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#181C20]">
                Comandero móvil offline
              </h3>
              <p className="text-xs md:text-sm text-[#5A6370] leading-relaxed">
                Toma pedidos desde cualquier celular sin depender de la señal Wi-Fi. Las comandas se resguardan en memoria y se sincronizan solas al reconectar.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="rounded-[24px] border border-[#EAE5DE] bg-[#FAF7F2] p-7 space-y-4 hover:border-[#EAA228] transition-all hover:shadow-md group">
              <div className="h-12 w-12 rounded-2xl bg-white border border-[#EAE5DE] flex items-center justify-center text-[#181C20] group-hover:bg-[#EAA228] group-hover:text-[#181C20] transition-colors">
                <ChefHat className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#181C20]">
                KDS cocina en vivo
              </h3>
              <p className="text-xs md:text-sm text-[#5A6370] leading-relaxed">
                Pantalla táctil que elimina comandas de papel. Semáforo por minutos transcurridos, campana sonora de aviso y despacho con un solo toque.
              </p>
            </div>

            {/* Pilar 4 */}
            <div className="rounded-[24px] border border-[#EAE5DE] bg-[#FAF7F2] p-7 space-y-4 hover:border-[#EAA228] transition-all hover:shadow-md group">
              <div className="h-12 w-12 rounded-2xl bg-white border border-[#EAE5DE] flex items-center justify-center text-[#181C20] group-hover:bg-[#EAA228] group-hover:text-[#181C20] transition-colors">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#181C20]">
                Caja y arqueo automático
              </h3>
              <p className="text-xs md:text-sm text-[#5A6370] leading-relaxed">
                Cobro en mesa o caja con división entre comensales, propinas voluntarias, impresión térmica de 80mm y arqueo diario exportable a CSV.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. SECCIÓN VISUAL DE HOSPITALIDAD ("HOSPITALIDAD HUMANA. PRECISIÓN CONECTADA")
      ========================================================================= */}
      <section className="py-20 md:py-28 bg-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Texto Descriptivo */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E5DFD7] bg-white px-3.5 py-1 text-xs font-bold text-[#EAA228]">
                <span>Para el equipo de piso y cocina</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-[#181C20] tracking-tight leading-[1.12]">
                Hospitalidad humana. <br />
                Precisión conectada.
              </h2>

              <p className="text-base text-[#5A6370] leading-relaxed">
                Paktak Tech nació en el ajetreo real de un restaurante: platos calientes, meseros atendiendo varias mesas a la vez y la necesidad de que la comanda llegue a cocina sin un solo error.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="h-6 w-6 rounded-full bg-[#EAA228]/20 text-[#D99318] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 font-bold" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#181C20]">
                      Botones grandes y contraste alto
                    </h4>
                    <p className="text-xs text-[#666E7A] mt-0.5">
                      Fácil de pulsar con una sola mano o en condiciones de luz cambiante en el salón.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="h-6 w-6 rounded-full bg-[#EAA228]/20 text-[#D99318] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 font-bold" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#181C20]">
                      Campana sonora en cocina y mesero
                    </h4>
                    <p className="text-xs text-[#666E7A] mt-0.5">
                      Avisos sonoros armónicos sin gritos ni timbres molestos cuando los platos están listos para retirar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="h-6 w-6 rounded-full bg-[#EAA228]/20 text-[#D99318] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 font-bold" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#181C20]">
                      Cero hardware costoso obligatorio
                    </h4>
                    <p className="text-xs text-[#666E7A] mt-0.5">
                      Funciona en cualquier celular Android/iOS, tablet básica o computadora que ya tengas en el local.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fotografía de Ambiente Gastronómico */}
            <div className="lg:col-span-6 relative">
              <div className="relative h-[380px] sm:h-[460px] rounded-[28px] overflow-hidden border border-[#E5DFD7] shadow-xl bg-[#FAF7F2]">
                <img
                  src="/images/restaurant_ambience.jpg"
                  alt="Restaurante en operación con cocina abierta"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#181C20]/80 via-transparent to-transparent pointer-events-none"></div>

                {/* Floating Metric Pill */}
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/40 shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAA228] text-[#181C20] flex items-center justify-center font-black">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#666E7A] block">
                        Rotación de mesa optimizada
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-[#181C20]">
                        12 minutos ahorrados por servicio
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#28A745] bg-[#EBF7EE] px-2.5 py-1 rounded-full">
                    +24% Mesas
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4.5. CONTROL DE CAJA Y ARQUEO SIN PUNTOS CIEGOS (FIGMA 04)
      ========================================================================= */}
      <CashControlSection />

      {/* =========================================================================
          5. KDS EN MODO OSCURO INMERSIVO ("UNA COCINA EN SINTONÍA. LA COMANDA VIVA")
      ========================================================================= */}
      <section id="kds" className="py-20 md:py-28 bg-[#161A1E] text-white">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 space-y-12">
          {/* Header de la sección KDS */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2D333B] bg-[#1E242B] px-3.5 py-1 text-xs font-bold text-[#EAA228]">
                <ChefHat className="h-3.5 w-3.5" />
                <span>Estación KDS · Cocina y Barra</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Una cocina en sintonía. <br />
                La comanda viva.
              </h2>
              <p className="text-sm md:text-base text-[#9DA7B3] leading-relaxed">
                Sin papeles extraviados, sin comandas borrosas por grasa o vapor. El cocinero sabe qué marcha primero gracias a la cola FIFO y los cronómetros de color.
              </p>
            </div>

            <Link
              href="/admin/cocina"
              className="inline-flex items-center gap-2 text-xs font-extrabold text-[#EAA228] hover:underline"
            >
              <span>Ver pantalla KDS en vivo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Tarjetas KDS Simuladas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Ticket 1: Normal (<10m) */}
            <div className="rounded-[22px] border border-[#2D333B] bg-[#1E242B] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2D333B]">
                <div>
                  <span className="text-lg font-black text-white">Mesa 04</span>
                  <span className="text-xs text-[#9DA7B3] block">Mesero: Carlos</span>
                </div>
                <span className="rounded-full bg-[#1E7E34]/20 border border-[#28A745]/40 text-[#28A745] px-3 py-1 text-xs font-extrabold">
                  06m 12s
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#272F38]">
                  <span className="font-bold text-white">2x Hamburguesa Artesanal</span>
                  <span className="text-[#EAA228] font-bold">Cocina</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#272F38]">
                  <span className="font-bold text-white">1x Papas Rústicas Queso</span>
                  <span className="text-[#EAA228] font-bold">Cocina</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#272F38] opacity-70">
                  <span className="font-medium text-[#CCD4DE]">2x Cerveza Rubia IPA</span>
                  <span className="text-[#64B5F6] font-bold">Barra</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full h-11 rounded-xl bg-[#28A745] hover:bg-[#218838] text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>Marchar Todo a Listo</span>
              </button>
            </div>

            {/* Ticket 2: Advertencia (10m - 20m) */}
            <div className="rounded-[22px] border border-[#EAA228]/40 bg-[#1E242B] p-5 space-y-4 relative">
              <div className="flex items-center justify-between pb-3 border-b border-[#2D333B]">
                <div>
                  <span className="text-lg font-black text-white">Mesa 09</span>
                  <span className="text-xs text-[#9DA7B3] block">Mesero: Sofía</span>
                </div>
                <span className="rounded-full bg-[#EAA228]/20 border border-[#EAA228]/60 text-[#EAA228] px-3 py-1 text-xs font-extrabold">
                  14m 45s
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#272F38]">
                  <span className="font-bold text-white">1x Bife de Chorizo 400g</span>
                  <span className="text-[#EAA228] font-bold">T. Medio</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#272F38]">
                  <span className="font-bold text-white">1x Risotto de Hongos</span>
                  <span className="text-[#EAA228] font-bold">Cocina</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full h-11 rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] font-black text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Clock className="h-4 w-4" />
                <span>Pasar a Preparando</span>
              </button>
            </div>

            {/* Ticket 3: Para Llevar / Token Listo */}
            <div className="rounded-[22px] border-2 border-[#28A745] bg-[#1E242B] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2D333B]">
                <div>
                  <span className="text-lg font-black text-white">Token #28 (Llevar)</span>
                  <span className="text-xs text-[#9DA7B3] block">Mostrador Caja</span>
                </div>
                <span className="rounded-full bg-[#28A745] text-white px-3 py-1 text-xs font-black animate-pulse">
                  🔔 ¡LISTO!
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#272F38] border-l-2 border-[#28A745]">
                  <span className="font-bold text-white">3x Tacos Birria con Consomé</span>
                  <Check className="h-4 w-4 text-[#28A745]" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#272F38] border-l-2 border-[#28A745]">
                  <span className="font-bold text-white">1x Nachos Especiales</span>
                  <Check className="h-4 w-4 text-[#28A745]" />
                </div>
              </div>

              <button
                type="button"
                className="w-full h-11 rounded-xl bg-[#2D333B] hover:bg-[#373E47] text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Entregar y Despachar</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. PLANES Y PRECIOS TRANSPARENTES
      ========================================================================= */}
      <section id="precios" className="py-20 md:py-28 bg-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#EAA228]">
              Precios transparentes
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#181C20] tracking-tight">
              Tu próximo paso empieza con 14 días gratis
            </h2>
            <p className="text-sm md:text-base text-[#5A6370] leading-relaxed">
              Sin cobros por comanda ni comisiones ocultas. Cancela o cambia de plan en cualquier momento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {/* Plan Básico */}
            <div className="rounded-[26px] border border-[#EAE5DE] bg-white p-7 sm:p-8 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <h3 className="text-xl font-black text-[#181C20]">Básico</h3>
                <p className="text-xs text-[#666E7A] leading-relaxed">
                  Para cafeterías, locales de paso y food trucks independientes.
                </p>
                <div className="pt-2">
                  <span className="text-4xl font-black text-[#181C20]">$29</span>
                  <span className="text-xs font-bold text-[#666E7A]"> / mes</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-[#555E6B] pt-4 border-t border-[#EAE5DE]">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#181C20] shrink-0" />
                    <span>Menú digital con código QR</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#181C20] shrink-0" />
                    <span>Hasta 8 mesas de salón</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#181C20] shrink-0" />
                    <span>Módulo de reservas en línea</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#181C20] shrink-0" />
                    <span>Pedidos en tiempo real</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/onboarding"
                className="mt-8 h-12 rounded-full border border-[#D9D3C7] bg-[#FAF7F2] text-xs font-black text-[#181C20] hover:bg-[#F3EFE8] flex items-center justify-center transition-colors"
              >
                Comenzar prueba
              </Link>
            </div>

            {/* Plan Pro (Destacado en Dorado) */}
            <div className="rounded-[26px] border-2 border-[#EAA228] bg-white p-7 sm:p-8 flex flex-col justify-between relative shadow-xl shadow-[#EAA228]/10 scale-100 md:-translate-y-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-[#181C20]">Restaurante Pro</h3>
                  <span className="rounded-full bg-[#EAA228] px-3 py-1 text-[11px] font-black text-[#181C20]">
                    MÁS ELEGIDO
                  </span>
                </div>
                <p className="text-xs text-[#666E7A] leading-relaxed">
                  Todo el salón, meseros, cocina y caja operando en sintonía.
                </p>
                <div className="pt-2">
                  <span className="text-4xl font-black text-[#181C20]">$59</span>
                  <span className="text-xs font-bold text-[#666E7A]"> / mes</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-[#181C20] pt-4 border-t border-[#EAE5DE]">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#EAA228] shrink-0" />
                    <span className="font-bold">Todo lo del Plan Básico</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#EAA228] shrink-0" />
                    <span className="font-black">App de meseros ilimitada (Offline)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#EAA228] shrink-0" />
                    <span className="font-black">KDS Cocina y Barra en tiempo real</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#EAA228] shrink-0" />
                    <span>Cobro de mesas, propina y división</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#EAA228] shrink-0" />
                    <span>Arqueo diario de caja y reportes</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#EAA228] shrink-0" />
                    <span>Impresión térmica 58mm y 80mm</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/onboarding"
                className="mt-8 h-12 rounded-full bg-[#EAA228] text-[#181C20] font-black text-xs hover:bg-[#D99318] flex items-center justify-center transition-colors shadow-sm"
              >
                Probar 14 días gratis
              </Link>
            </div>

            {/* Plan Multi-Sucursal */}
            <div className="rounded-[26px] border border-[#EAE5DE] bg-white p-7 sm:p-8 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <h3 className="text-xl font-black text-[#181C20]">Multi-Sucursal</h3>
                <p className="text-xs text-[#666E7A] leading-relaxed">
                  Para franquicias, cadenas y marcas en expansión con varios locales.
                </p>
                <div className="pt-2">
                  <span className="text-4xl font-black text-[#181C20]">$99</span>
                  <span className="text-xs font-bold text-[#666E7A]"> / mes</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-[#555E6B] pt-4 border-t border-[#EAE5DE]">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#181C20] shrink-0" />
                    <span>Múltiples sucursales sincronizadas</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#181C20] shrink-0" />
                    <span>Cartas y precios diferenciados</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#181C20] shrink-0" />
                    <span>Reportes consolidados multi-tienda</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#181C20] shrink-0" />
                    <span>Soporte prioritario 24/7</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://wa.me/593999999999?text=Hola,%20deseo%20informacion%20del%20Plan%20Multi-Sucursal%20de%20Paktak%20Tech"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 h-12 rounded-full border border-[#D9D3C7] bg-[#FAF7F2] text-xs font-black text-[#181C20] hover:bg-[#F3EFE8] flex items-center justify-center transition-colors"
              >
                Contactar asesor
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6.5. PREGUNTAS FRECUENTES (FIGMA 06 / ANTES DE EMPEZAR)
      ========================================================================= */}
      <FaqSection />

      {/* =========================================================================
          6.6. FORMULARIO DE CONTACTO Y WHATSAPP (FIGMA 07 / CONVERSEMOS)
      ========================================================================= */}
      <ContactSection />

      {/* =========================================================================
          7. BANNER FINAL DESTACADO EN DORADO (IDÉNTICO A LA REFERENCIA)
      ========================================================================= */}
      <section className="py-20 md:py-24 bg-[#EAA228] text-[#181C20]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 text-center space-y-6">
          <span className="text-xs font-black uppercase tracking-widest bg-[#181C20] text-white px-3.5 py-1 rounded-full inline-block">
            Tu negocio bajo control
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight max-w-3xl mx-auto">
            Más tiempo para recibir bien. <br className="hidden sm:inline" />
            Más claridad para crecer.
          </h2>

          <p className="text-base sm:text-lg text-[#3A3322] max-w-2xl mx-auto font-bold leading-relaxed">
            Te ayudamos a cargar tu menú y configurar tus mesas sin costo adicional durante el período de prueba.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto h-14 px-9 rounded-full bg-[#181C20] text-white font-black text-base hover:bg-[#2A313A] shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Comenzar ahora gratis</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="https://wa.me/593999999999?text=Hola,%20deseo%20una%20demostracion%20de%20Paktak%20Tech"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto h-14 px-8 rounded-full border-2 border-[#181C20] bg-transparent text-[#181C20] font-black text-base hover:bg-[#181C20] hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Escribir por WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. FOOTER OSCURO MINIMALISTA
      ========================================================================= */}
      <footer className="bg-[#161A1E] border-t border-[#252B33] py-14 text-sm text-[#9DA7B3]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-[#252B33]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EAA228] text-[#181C20] flex items-center justify-center font-black text-sm">
                P
              </div>
              <div>
                <span className="font-extrabold text-white text-base block">
                  Paktak Tech SaaS
                </span>
                <span className="text-xs text-[#6B7584]">
                  Software gastronómico para Ecuador y América Latina
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-[#CCD4DE]">
              <a href="#modulos" className="hover:text-white transition-colors">
                Módulos
              </a>
              <a href="#control-caja" className="hover:text-white transition-colors">
                Control Caja
              </a>
              <a href="#kds" className="hover:text-white transition-colors">
                KDS Cocina
              </a>
              <a href="#precios" className="hover:text-white transition-colors">
                Precios
              </a>
              <a href="#faq" className="hover:text-white transition-colors">
                Preguntas Frecuentes
              </a>
              <a href="#contacto" className="hover:text-white transition-colors">
                Contacto
              </a>
              <Link href="/auth/login" className="hover:text-[#EAA228] transition-colors">
                Ingreso Personal
              </Link>
              <Link href="/onboarding" className="text-[#EAA228] hover:underline">
                Crear Restaurante
              </Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7584]">
            <p>© 2026 Paktak Tech. Todos los derechos reservados.</p>
            <p className="flex items-center gap-2">
              <span>Hecho para la hospitalidad de alta exigencia.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
