import Link from 'next/link';

export const metadata = {
  title: 'Paktak Tech | El Sistema Operativo Moderno para Restaurantes',
  description: 'Software gastronómico todo-en-uno: Menú QR digital, KDS para cocina, app de mesero offline y cierre de caja en tiempo real.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#f3a806] flex items-center justify-center font-black text-zinc-950 text-sm shadow-xs">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight leading-none text-zinc-900 dark:text-zinc-100">
                Paktak Tech
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                SaaS Gastronómico
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            <a href="#modulos" className="hover:text-black dark:hover:text-white transition-colors">
              Módulos
            </a>
            <a href="#kds" className="hover:text-black dark:hover:text-white transition-colors">
              Cocina (KDS)
            </a>
            <a href="#precios" className="hover:text-black dark:hover:text-white transition-colors">
              Precios
            </a>
            <Link href="/los-champiz/pedir" className="text-amber-600 dark:text-amber-400 hover:underline">
              Demo Tienda ↗
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-black dark:hover:text-white transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/onboarding"
              className="h-10 px-5 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-xs tracking-wide shadow-md transition-all active:scale-95 flex items-center justify-center"
            >
              Prueba Gratis 14 Días
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              <span>🚀 Diseñado para Negocios Reales en Ecuador y Latinoamérica</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-[1.1]">
              El Sistema Operativo Moderno para tu{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">
                Restaurante
              </span>
            </h1>

            <p className="text-sm sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Pedidos QR directos a la cocina, app móvil de meseros sin depender del Wi-Fi, pantalla KDS con alertas en tiempo real, cobro de cuentas con propinas y arqueo diario de caja.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <Link
                href="/onboarding"
                className="w-full sm:w-auto h-12 px-8 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-sm tracking-wide shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Comenzar Prueba Gratis (14 Días)</span>
                <span>→</span>
              </Link>
              <Link
                href="/los-champiz/pedir"
                target="_blank"
                className="w-full sm:w-auto h-12 px-8 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
              >
                <span>Ver Menú Digital de Prueba</span>
                <span>↗</span>
              </Link>
            </div>

            <p className="text-[11px] text-zinc-400">
              ✓ Sin tarjeta de crédito requerida · Configuración lista en 3 minutos · Soporte por WhatsApp
            </p>
          </div>

          {/* Interactive Feature Banner */}
          <div className="mt-14 max-w-5xl mx-auto rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-8 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-zinc-400 ml-2">paktak.tech · Operación en Vivo</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Sincronización en Tiempo Real
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-4">
                <div className="text-2xl mb-2">📱</div>
                <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Menú QR & Tienda</h2>
                <p className="text-[11px] text-zinc-500 mt-1">Catálogo interactivo con carrito, personalización y checkout.</p>
              </div>

              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-4">
                <div className="text-2xl mb-2">🤵</div>
                <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">App Mesero Offline</h2>
                <p className="text-[11px] text-zinc-500 mt-1">Toma comandas en la mesa sin miedo a caídas de internet.</p>
              </div>

              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-4">
                <div className="text-2xl mb-2">🍳</div>
                <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">KDS Cocina</h2>
                <p className="text-[11px] text-zinc-500 mt-1">Comandas con tiempo transcurrido y alerta sonora de comanda.</p>
              </div>

              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-4">
                <div className="text-2xl mb-2">💳</div>
                <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Caja & Reportes</h2>
                <p className="text-[11px] text-zinc-500 mt-1">Cierre de mesas con propinas, división y arqueo del turno.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Módulos Detallados */}
      <section id="modulos" className="py-20 bg-white dark:bg-zinc-900 border-y border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Diseñado para la velocidad</span>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
              Todo lo que tu equipo necesita en cada turno
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-8 space-y-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-2xl">
                🪑
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Gestión de Salón & Mesas
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Control visual en tiempo real de mesas libres, ocupadas y reservadas. Asigna clientes al instante y cobra cuentas divididas entre varios comensales.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-8 space-y-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-2xl">
                📶
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Mesero Offline-First (Dexie.js)
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Si el router se apaga o la señal no llega al rincón del local, el mesero sigue tomando pedidos. El sistema los encola en la memoria del celular y los envía solos.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-8 space-y-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl">
                📈
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Arqueo de Caja & Métricas
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Cuadra la caja al minuto: conoce cuánto dinero en efectivo debe haber físicamente frente a los pagos con tarjeta y transferencias. Exporta a CSV con un clic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pricing Section */}
      <section id="precios" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Planes Transparentes</span>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            Elige el plan ideal para tu restaurante
          </h2>
          <p className="text-xs text-zinc-500 mt-2">
            Todos los planes incluyen 14 días de prueba gratis completa sin compromiso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Plan Básico */}
          <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Básico</h3>
              <p className="text-xs text-zinc-500">Para cafeterías y locales pequeños en crecimiento.</p>
              <div className="pt-2">
                <span className="text-4xl font-black text-zinc-900 dark:text-zinc-100">$29</span>
                <span className="text-xs text-zinc-400"> / mes</span>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <li>✓ Menú Digital con código QR</li>
                <li>✓ Hasta 8 mesas de salón</li>
                <li>✓ Módulo de reservas públicas</li>
                <li>✓ Pedidos en tiempo real</li>
                <li>✓ Soporte estándar por WhatsApp</li>
              </ul>
            </div>
            <Link
              href="/onboarding"
              className="mt-8 h-11 rounded-full border border-zinc-300 dark:border-zinc-700 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
            >
              Comenzar Prueba
            </Link>
          </div>

          {/* Plan Pro (Destacado) */}
          <div className="rounded-3xl border-2 border-[#f3a806] bg-white dark:bg-zinc-900 p-8 flex flex-col justify-between shadow-xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#f3a806] text-zinc-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
              Más Recomendado
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Restaurante Pro</h3>
              <p className="text-xs text-zinc-500">Todo el restaurante conectado en salón, meseros y cocina.</p>
              <div className="pt-2">
                <span className="text-4xl font-black text-zinc-900 dark:text-zinc-100">$59</span>
                <span className="text-xs text-zinc-400"> / mes</span>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <li>✓ Todo lo del Plan Básico</li>
                <li>✓ <strong>Mesero Offline-First ilimitado</strong></li>
                <li>✓ <strong>KDS Cocina con alertas sonoras</strong></li>
                <li>✓ Cobro de cuenta, división y propinas</li>
                <li>✓ Arqueo diario de caja y reportes</li>
                <li>✓ Impresión de tickets térmicos 80mm</li>
              </ul>
            </div>
            <Link
              href="/onboarding"
              className="mt-8 h-11 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 text-xs font-bold shadow-md flex items-center justify-center transition-all active:scale-[0.99]"
            >
              Probar 14 Días Gratis
            </Link>
          </div>

          {/* Plan Enterprise */}
          <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Multi-Sucursal</h3>
              <p className="text-xs text-zinc-500">Para cadenas de comida rápida y franquicias.</p>
              <div className="pt-2">
                <span className="text-4xl font-black text-zinc-900 dark:text-zinc-100">$99</span>
                <span className="text-xs text-zinc-400"> / mes</span>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <li>✓ Múltiples locales y sucursales</li>
                <li>✓ Menús y precios diferenciados</li>
                <li>✓ Reportes consolidados de ventas</li>
                <li>✓ Integración futura SRI Facturación</li>
                <li>✓ Soporte prioritario 24/7</li>
              </ul>
            </div>
            <a
              href="https://wa.me/593999999999?text=Hola,%20deseo%20información%20del%20Plan%20Multi-Sucursal%20de%20Paktak%20Tech"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 h-11 rounded-full border border-zinc-300 dark:border-zinc-700 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
            >
              Contactar Asesor
            </a>
          </div>
        </div>
      </section>

      {/* 5. CTA Final & Contacto por WhatsApp */}
      <section className="py-16 bg-amber-500 text-zinc-950">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            ¿Listo para modernizar la atención de tu restaurante?
          </h2>
          <p className="text-sm font-semibold max-w-xl mx-auto">
            Configura tu local hoy mismo. Te ayudamos a cargar tu menú y capacitar a tus meseros sin costo adicional durante tu período de prueba.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              href="/onboarding"
              className="h-12 px-8 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 font-bold text-xs tracking-wide shadow-xl flex items-center justify-center"
            >
              Crear Mi Restaurante Ahora →
            </Link>
            <a
              href="https://wa.me/593999999999?text=Hola,%20deseo%20una%20demostración%20de%20Paktak%20Tech%20SaaS"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-8 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-2"
            >
              <span>💬 Escribir al WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="bg-zinc-950 text-zinc-400 py-12 text-xs border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#f3a806] flex items-center justify-center font-black text-zinc-950 text-[10px]">
              P
            </div>
            <span className="font-bold text-white text-sm">Paktak Tech SaaS</span>
          </div>
          <p className="text-zinc-500 text-[11px]">
            © 2026 Paktak Tech. Todos los derechos reservados. Desarrollado con tecnología Next.js 16 y Supabase.
          </p>
          <div className="flex items-center gap-4 text-zinc-400">
            <Link href="/auth/login" className="hover:text-white">Admin Login</Link>
            <Link href="/onboarding" className="hover:text-white">Registro</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
