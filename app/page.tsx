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
  MessageCircle,
} from 'lucide-react';

export const metadata = {
  title: 'Paktak Tech | El sistema operativo moderno para restaurantes',
  description:
    'Software gastronómico simple y legible: Menú digital, cocina KDS en tiempo real, app de mesero offline y cierre de caja.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#1A1A1A]">
      {/* 1. Header Sticky (72px desktop, 64px mobile) */}
      <header className="sticky top-0 z-50 h-16 md:h-[72px] bg-white border-b border-[#E8E8E8]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-extrabold text-base">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg leading-tight tracking-tight text-[#1A1A1A]">
                Paktak Tech
              </span>
              <span className="text-[11px] font-semibold text-[#6B6B6B]">
                Gestión para restaurantes
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#6B6B6B]">
            <a href="#modulos" className="hover:text-[#1A1A1A] transition-colors">
              Módulos
            </a>
            <a href="#precios" className="hover:text-[#1A1A1A] transition-colors">
              Planes
            </a>
            <Link
              href="/los-champiz/pedir"
              target="_blank"
              className="hover:text-[#1A1A1A] flex items-center gap-1 transition-colors"
            >
              <span>Ver tienda de prueba</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="h-10 px-4 rounded-full text-sm font-semibold text-[#1A1A1A] hover:bg-[#F7F7F7] flex items-center justify-center transition-colors"
            >
              Ingresar
            </Link>
            <Link
              href="/onboarding"
              className="h-10 md:h-11 px-5 rounded-full bg-[#FFC21A] text-[#1A1A1A] font-extrabold text-sm hover:opacity-90 flex items-center justify-center transition-opacity"
            >
              Prueba gratis
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-[#F7F7F7] px-4 py-1.5 text-xs font-semibold text-[#1A1A1A]">
              <span>Diseñado para restaurantes reales en Ecuador y Latinoamérica</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#1A1A1A] leading-[1.1]">
              El sistema operativo moderno para tu restaurante
            </h1>

            <p className="text-base md:text-xl text-[#6B6B6B] max-w-2xl mx-auto leading-relaxed">
              Menú digital para clientes, comanda de meseros sin depender del internet, pantalla de cocina en tiempo real y cobros claros con cierre de caja diario.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/onboarding"
                className="w-full sm:w-auto h-14 px-8 rounded-full bg-[#FFC21A] text-[#1A1A1A] font-extrabold text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <span>Comenzar prueba gratis de 14 días</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/los-champiz/pedir"
                target="_blank"
                className="w-full sm:w-auto h-14 px-8 rounded-full border border-[#E8E8E8] bg-white text-[#1A1A1A] font-extrabold text-base hover:bg-[#F7F7F7] transition-colors flex items-center justify-center gap-2"
              >
                <span>Probar catálogo de cliente</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            <p className="text-xs text-[#6B6B6B] pt-2">
              Sin tarjeta de crédito · Activación en 3 minutos · Soporte directo por WhatsApp
            </p>
          </div>

          {/* 4 Módulos Esenciales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
            <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-6 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#F7F7F7] border border-[#E8E8E8] flex items-center justify-center text-[#1A1A1A]">
                <Smartphone className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">Menú digital QR</h2>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                Catálogo amplio y legible para tus clientes con selector de cantidad directo.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-6 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#F7F7F7] border border-[#E8E8E8] flex items-center justify-center text-[#1A1A1A]">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">App mesero offline</h2>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                Toma pedidos al instante desde cualquier teléfono celular, incluso sin señal Wi-Fi.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-6 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#F7F7F7] border border-[#E8E8E8] flex items-center justify-center text-[#1A1A1A]">
                <ChefHat className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">KDS cocina en vivo</h2>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                Pantalla oscura de alto contraste con cronómetro de espera y avance en un toque.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-6 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#F7F7F7] border border-[#E8E8E8] flex items-center justify-center text-[#1A1A1A]">
                <CreditCard className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">Caja y reportes</h2>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                Cierre de cuentas, división por persona, propina voluntaria y arqueo diario.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Módulos Operativos Detallados */}
      <section id="modulos" className="py-20 bg-[#F7F7F7] border-y border-[#E8E8E8]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#6B6B6B]">
              Operación real
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A1A1A] mt-2">
              Todo lo necesario para cada turno de trabajo
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-8 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[#F7F7F7] flex items-center justify-center text-[#1A1A1A]">
                <Armchair className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-extrabold text-[#1A1A1A]">Gestión de salón y mesas</h3>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                Visualiza el estado de las mesas en tiempo real. Asigna pedidos a paletas de madera o mesas fijas y cobra con división automática de cuenta.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-8 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[#F7F7F7] flex items-center justify-center text-[#1A1A1A]">
                <Wifi className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-extrabold text-[#1A1A1A]">Meseros sin depender de internet</h3>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                Si la conexión falla, el mesero continúa atendiendo. La comanda se guarda de forma segura en el dispositivo y se sincroniza al recuperar la red.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-8 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[#F7F7F7] flex items-center justify-center text-[#1A1A1A]">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-extrabold text-[#1A1A1A]">Arqueo diario y costos</h3>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                Conoce el desglose por canal de venta, costo de insumos versus margen neto y descarga tus reportes en formato CSV con un solo clic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Planes y Precios */}
      <section id="precios" className="py-20 md:py-28 max-w-[1200px] mx-auto px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#6B6B6B]">
            Precios transparentes
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A1A1A] mt-2">
            Elige el plan ideal para tu negocio
          </h2>
          <p className="text-sm text-[#6B6B6B] mt-2">
            Todos los planes incluyen 14 días de prueba completa sin compromiso ni tarjeta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
          {/* Plan Básico */}
          <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xl font-extrabold text-[#1A1A1A]">Básico</h3>
              <p className="text-xs text-[#6B6B6B]">Para locales pequeños, cafeterías y food trucks.</p>
              <div className="pt-2">
                <span className="text-4xl font-extrabold text-[#1A1A1A]">$29</span>
                <span className="text-xs text-[#6B6B6B]"> / mes</span>
              </div>
              <ul className="space-y-3 text-sm text-[#6B6B6B] pt-4 border-t border-[#E8E8E8]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Menú digital con código QR</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Hasta 8 mesas de salón</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Módulo de reservas en línea</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Pedidos en tiempo real</span>
                </li>
              </ul>
            </div>
            <Link
              href="/onboarding"
              className="mt-8 h-12 rounded-full border border-[#E8E8E8] bg-white text-sm font-extrabold text-[#1A1A1A] hover:bg-[#F7F7F7] flex items-center justify-center transition-colors"
            >
              Comenzar prueba
            </Link>
          </div>

          {/* Plan Pro (Destacado) */}
          <div className="rounded-[24px] border-2 border-[#1A1A1A] bg-white p-8 flex flex-col justify-between relative shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-[#1A1A1A]">Restaurante Pro</h3>
                <span className="rounded-full bg-[#1A1A1A] px-3 py-1 text-[11px] font-bold text-white">
                  Más popular
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B]">Todo el restaurante conectado en salón, meseros y cocina.</p>
              <div className="pt-2">
                <span className="text-4xl font-extrabold text-[#1A1A1A]">$59</span>
                <span className="text-xs text-[#6B6B6B]"> / mes</span>
              </div>
              <ul className="space-y-3 text-sm text-[#1A1A1A] pt-4 border-t border-[#E8E8E8]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Todo lo del Plan Básico</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span className="font-extrabold">App de meseros ilimitada</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span className="font-extrabold">KDS Cocina en vivo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Cobro de mesas, propina y división</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Arqueo diario y reporte de costos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Impresión térmica 58mm y 80mm</span>
                </li>
              </ul>
            </div>
            <Link
              href="/onboarding"
              className="mt-8 h-12 rounded-full bg-[#FFC21A] text-[#1A1A1A] font-extrabold text-sm hover:opacity-90 flex items-center justify-center transition-opacity"
            >
              Probar 14 días gratis
            </Link>
          </div>

          {/* Plan Multi-Sucursal */}
          <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xl font-extrabold text-[#1A1A1A]">Multi-Sucursal</h3>
              <p className="text-xs text-[#6B6B6B]">Para cadenas de comida rápida, marcas y franquicias.</p>
              <div className="pt-2">
                <span className="text-4xl font-extrabold text-[#1A1A1A]">$99</span>
                <span className="text-xs text-[#6B6B6B]"> / mes</span>
              </div>
              <ul className="space-y-3 text-sm text-[#6B6B6B] pt-4 border-t border-[#E8E8E8]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Múltiples sucursales y locales</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Menús y precios diferenciados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Reportes consolidados de ventas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1A1A1A]" />
                  <span>Soporte prioritario</span>
                </li>
              </ul>
            </div>
            <a
              href="https://wa.me/593999999999?text=Hola,%20deseo%20informacion%20del%20Plan%20Multi-Sucursal%20de%20Paktak%20Tech"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 h-12 rounded-full border border-[#E8E8E8] bg-white text-sm font-extrabold text-[#1A1A1A] hover:bg-[#F7F7F7] flex items-center justify-center transition-colors"
            >
              Contactar asesor
            </a>
          </div>
        </div>
      </section>

      {/* 5. CTA Final */}
      <section className="py-20 bg-[#F7F7F7] border-t border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A1A1A]">
            Moderniza la atención de tu restaurante hoy
          </h2>
          <p className="text-base text-[#6B6B6B] leading-relaxed">
            Te acompañamos en la carga de tu menú y en la configuración de tus mesas sin costo durante el período de prueba.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto h-14 px-8 rounded-full bg-[#FFC21A] text-[#1A1A1A] font-extrabold text-base hover:opacity-90 flex items-center justify-center transition-opacity"
            >
              Crear mi restaurante ahora
            </Link>
            <a
              href="https://wa.me/593999999999?text=Hola,%20deseo%20una%20demostracion%20de%20Paktak%20Tech"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto h-14 px-8 rounded-full border border-[#E8E8E8] bg-white text-[#1A1A1A] font-extrabold text-base hover:bg-[#F7F7F7] flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Escribir por WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="bg-white border-t border-[#E8E8E8] py-12 text-sm text-[#6B6B6B]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-extrabold text-xs">
              P
            </div>
            <span className="font-extrabold text-[#1A1A1A]">Paktak Tech SaaS</span>
          </div>
          <p className="text-xs text-[#6B6B6B]">
            © 2026 Paktak Tech. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6 text-xs font-semibold">
            <Link href="/auth/login" className="hover:text-[#1A1A1A] transition-colors">
              Ingreso administrador
            </Link>
            <Link href="/onboarding" className="hover:text-[#1A1A1A] transition-colors">
              Crear cuenta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
