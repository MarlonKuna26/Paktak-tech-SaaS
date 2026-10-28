'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Coffee,
  UtensilsCrossed,
  Cake,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Building2,
  HelpCircle,
  ExternalLink,
  Store,
  DollarSign,
  Info,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface CategoryItem {
  id: string;
  name: string;
  desc: string;
  station: 'cocina' | 'barra';
  iconType: 'coffee' | 'utensils' | 'cake' | 'custom';
}

const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: '1',
    name: 'Bebidas',
    desc: 'Café, jugos y bebidas frías',
    station: 'barra',
    iconType: 'coffee',
  },
  {
    id: '2',
    name: 'Platos Fuertes',
    desc: 'Los favoritos de tu cocina',
    station: 'cocina',
    iconType: 'utensils',
  },
  {
    id: '3',
    name: 'Postres',
    desc: 'Un dulce para terminar',
    station: 'cocina',
    iconType: 'cake',
  },
];

export function OnboardingWizard({ initialUserEmail }: { initialUserEmail?: string | null }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Wizard Step: 1, 2, 3, 4
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Tu Local
  const [restaurantName, setRestaurantName] = useState('Café de la Plaza');
  const [slug, setSlug] = useState('cafe-de-la-plaza');
  const [country, setCountry] = useState('Ecuador');
  const [city, setCity] = useState('Quito');
  const [phone, setPhone] = useState('');

  // Step 2: Tus Mesas
  const [tablesCount, setTablesCount] = useState(8);
  const [tableCapacity, setTableCapacity] = useState(4);
  const [startNumber, setStartNumber] = useState('01');

  // Step 3: Tu Carta
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatStation, setNewCatStation] = useState<'cocina' | 'barra'>('cocina');

  // Step 4: Tu Cuenta
  const [fullName, setFullName] = useState('Daniela Vega');
  const [email, setEmail] = useState(initialUserEmail || 'daniela@cafedelaplaza.example');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Helpers
  const handleNameChange = (name: string) => {
    setRestaurantName(name);
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: CategoryItem = {
      id: Date.now().toString(),
      name: newCatName.trim(),
      desc: newCatStation === 'barra' ? 'Bebidas preparadas en barra' : 'Platos elaborados en cocina',
      station: newCatStation,
      iconType: 'custom',
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
    setIsAddingCategory(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) return;
    setCategories(categories.filter((c) => c.id !== id));
  };

  const handleFinishOnboarding = async () => {
    setError('');

    if (!acceptedTerms) {
      setError('Debes aceptar los Términos de servicio y Política de privacidad.');
      return;
    }

    if (!initialUserEmail && (!email.trim() || password.length < 6)) {
      setError('Ingresa un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Auth check or SignUp
      if (!initialUserEmail) {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim() || 'Administrador',
            },
          },
        });

        if (authErr) {
          throw new Error(authErr.message);
        }

        if (!authData.user) {
          throw new Error('No se pudo registrar la cuenta. Intenta de nuevo.');
        }
      }

      // 2. Call backend Onboarding API
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: restaurantName.trim() || 'Mi Restaurante',
          slug: slug.trim() || 'mi-restaurante',
          phone: phone.trim() || null,
          address: `${city}, ${country}`,
          tablesCount: tablesCount,
          categories: categories.map((c) => c.name),
        }),
      });

      const body = (await res.json()) as { error?: string; success?: boolean };

      if (!res.ok || !body.success) {
        throw new Error(body.error || 'No se pudo crear el restaurante.');
      }

      // 3. Success -> redirect to admin
      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado durante el registro.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FAF7F2] font-sans text-[#181C20] selection:bg-[#EAA228] selection:text-[#181C20]">
      {/* =========================================================================
          COLUMNA IZQUIERDA: SIDEBAR OSCURO DE IDENTIDAD Y PROGRESO (IDÉNTICO A FIGMA)
      ========================================================================= */}
      <aside className="w-full lg:w-[380px] xl:w-[420px] bg-[#161A1E] text-white p-6 sm:p-10 flex flex-col justify-between shrink-0 border-b lg:border-b-0 lg:border-r border-[#262C34]">
        <div className="space-y-8">
          {/* Logo Paktak Tech */}
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#EAA228] text-[#181C20] flex items-center justify-center font-black text-base shadow-sm group-hover:scale-105 transition-transform">
              P
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              Paktak Tech
            </span>
          </Link>

          {/* Heading Editorial */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#EAA228] block">
              TU LOCAL, EN SU PUNTO
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-[1.12] tracking-tight">
              Preparar todo <br />
              también puede <br />
              ser sencillo.
            </h1>
          </div>

          {/* Stepper Vertical */}
          <div className="space-y-4 pt-2">
            {[
              { num: 1, title: 'Tu local', id: '01' },
              { num: 2, title: 'Tus mesas', id: '02' },
              { num: 3, title: 'Tu carta', id: '03' },
              { num: 4, title: 'Tu cuenta', id: '04' },
            ].map((s) => {
              const isActive = step === s.num;
              const isCompleted = step > s.num;

              return (
                <div key={s.num} className="flex items-center gap-3.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs transition-colors shrink-0 ${
                      isActive
                        ? 'bg-[#EAA228] text-[#181C20] shadow-sm'
                        : isCompleted
                        ? 'bg-[#1E7E34] text-white'
                        : 'bg-[#252C34] text-[#8C95A3]'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : s.id}
                  </div>
                  <div>
                    <h3 className={`text-sm font-extrabold ${isActive || isCompleted ? 'text-white' : 'text-[#8C95A3]'}`}>
                      {s.title}
                    </h3>
                    <span className="text-[11px] font-medium text-[#6B7584]">
                      {isActive ? 'En este paso' : isCompleted ? 'Completado' : 'A continuación'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen Flotante y Link de Ayuda */}
        <div className="space-y-4 pt-10">
          <div className="rounded-2xl bg-[#1E242B] border border-[#2D3540] p-4.5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#EAA228]/15 text-[#EAA228] flex items-center justify-center">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white leading-tight">
                  {restaurantName || 'Tu restaurante'}
                </h4>
                <p className="text-[10px] text-[#8C95A3]">
                  {city}, {country} · USD
                </p>
              </div>
            </div>

            {step >= 2 && (
              <div className="text-[11px] font-bold text-[#EAA228] pt-1 border-t border-[#2D3540]/60">
                {tablesCount} mesas · {tablesCount * tableCapacity} personas
              </div>
            )}

            <div className="text-[10px] text-[#A6B1C0] leading-snug pt-1">
              14 días de prueba gratuita. Sin tarjeta de crédito.
            </div>
          </div>

          <a
            href="https://wa.me/593999999999?text=Hola,%20necesito%20ayuda%20con%20el%20onboarding%20de%20Paktak%20Tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#8C95A3] hover:text-white flex items-center gap-1.5 transition-colors font-medium"
          >
            <span>¿Necesitas ayuda? Contactar soporte</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </aside>

      {/* =========================================================================
          COLUMNA DERECHA: WIZARD INTERACTIVO EN FONDO CLARO (CANVAS DE TRABAJO)
      ========================================================================= */}
      <main className="flex-1 bg-[#FAF7F2] p-6 sm:p-10 md:p-14 lg:p-16 flex flex-col justify-between max-w-4xl mx-auto w-full">
        <div className="space-y-8">
          {/* Header de Progreso Superior Segmentado */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#181C20]">
              <span className="uppercase tracking-wider">PASO 0{step} DE 04</span>
              <span className="text-[#666E7A] font-medium">
                {4 - step === 0 ? 'Un último paso' : `${4 - step} pasos por delante`}
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s ? 'bg-[#EAA228]' : 'bg-[#E5DFD7]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-600 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span>{error}</span>
            </div>
          )}

          {/* ===================================================================
              PASO 1: TU LOCAL (NOMBRE, SLUG, PAÍS, CIUDAD)
          =================================================================== */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-[#181C20] tracking-tight">
                  Empecemos por tu local.
                </h2>
                <p className="text-xs sm:text-sm text-[#5A6370]">
                  Así te encontrarán tus comensales. Puedes ajustar estos datos después.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                {/* Nombre del local */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-[#181C20]">
                    Nombre del local
                  </label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Café de la Plaza"
                    className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-white text-sm font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228] focus:border-transparent transition-all"
                  />
                </div>

                {/* Enlace de tu menú */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-[#181C20]">
                      Enlace de tu menú
                    </label>
                    <span className="rounded-full bg-[#EBF7EE] text-[#1E7E34] text-[10px] font-black px-2.5 py-0.5">
                      Generado automáticamente
                    </span>
                  </div>

                  <div className="flex items-center rounded-xl border border-[#D9D3C7] bg-[#FAF7F2] overflow-hidden focus-within:ring-2 focus-within:ring-[#EAA228]">
                    <span className="px-3.5 text-xs font-bold text-[#8C95A3] shrink-0">
                      /
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full h-12 bg-transparent text-sm font-bold text-[#181C20] focus:outline-none"
                    />
                    <span className="px-3.5 text-xs font-bold text-[#8C95A3] shrink-0">
                      /pedir
                    </span>
                  </div>
                  <p className="text-[11px] text-[#666E7A]">
                    Se crea a partir del nombre. Puedes editarlo antes de continuar.
                  </p>
                </div>

                {/* País y Ciudad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-[#181C20]">
                      País
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-white text-sm font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                    >
                      <option value="Ecuador">Ecuador 🇪🇨</option>
                      <option value="Colombia">Colombia 🇨🇴</option>
                      <option value="Perú">Perú 🇵🇪</option>
                      <option value="México">México 🇲🇽</option>
                      <option value="Estados Unidos">Estados Unidos 🇺🇸</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-[#181C20]">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Quito"
                      className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-white text-sm font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                    />
                  </div>
                </div>

                {/* Callout moneda USD */}
                <div className="rounded-2xl bg-[#FAF7F2] border border-[#EAE5DE] p-4 flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#EAE5DE] text-[#181C20] flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-[#EAA228]" />
                  </div>
                  <div className="text-xs">
                    <span className="font-extrabold text-[#181C20] block">
                      Precios en dólares estadounidenses
                    </span>
                    <span className="text-[#666E7A]">
                      USD · Podrás revisar moneda e IVA en Ajustes.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              PASO 2: TUS MESAS (CANTIDAD, CAPACIDAD, PLANO INICIAL)
          =================================================================== */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-[#181C20] tracking-tight">
                  Un lugar para cada mesa.
                </h2>
                <p className="text-xs sm:text-sm text-[#5A6370]">
                  Crea un plano inicial. Luego podrás mover, agregar o editar tus mesas.
                </p>
              </div>

              {/* Fila de controles: Cantidad, Capacidad, Numerar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Cantidad con botones +/- */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-[#181C20]">
                    Cantidad de mesas
                  </label>
                  <div className="flex items-center rounded-xl border border-[#D9D3C7] bg-white h-12 px-2 justify-between">
                    <button
                      type="button"
                      onClick={() => setTablesCount(Math.max(1, tablesCount - 1))}
                      className="w-8 h-8 rounded-lg bg-[#FAF7F2] hover:bg-[#EAE5DE] text-[#181C20] font-black text-sm flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="font-black text-sm text-[#181C20]">{tablesCount}</span>
                    <button
                      type="button"
                      onClick={() => setTablesCount(Math.min(30, tablesCount + 1))}
                      className="w-8 h-8 rounded-lg bg-[#FAF7F2] hover:bg-[#EAE5DE] text-[#181C20] font-black text-sm flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Capacidad por mesa */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-[#181C20]">
                    Capacidad por mesa
                  </label>
                  <select
                    value={tableCapacity}
                    onChange={(e) => setTableCapacity(Number(e.target.value))}
                    className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-white text-sm font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                  >
                    <option value={2}>2 personas</option>
                    <option value={4}>4 personas</option>
                    <option value={6}>6 personas</option>
                    <option value={8}>8 personas</option>
                  </select>
                </div>

                {/* Numerar desde */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-[#181C20]">
                    Numerar desde
                  </label>
                  <input
                    type="text"
                    value={startNumber}
                    onChange={(e) => setStartNumber(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-white text-sm font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                  />
                </div>
              </div>

              {/* Plano Gráfico de Mesas (Preview de Figma) */}
              <div className="rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#181C20]">
                    SALÓN PRINCIPAL
                  </span>
                  <span className="text-xs font-bold text-[#666E7A]">
                    {tablesCount} mesas · {tablesCount * tableCapacity} personas
                  </span>
                </div>

                {/* Table Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[260px] overflow-y-auto p-1">
                  {Array.from({ length: tablesCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#EAE5DE] bg-white p-3.5 text-center shadow-xs space-y-0.5"
                    >
                      <span className="text-lg font-black text-[#181C20] block">
                        {String(idx + Number(startNumber || 1)).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-semibold text-[#666E7A] block">
                        {tableCapacity} personas
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-[#666E7A] pt-2 border-t border-[#EAE5DE]">
                  <span>○ Mesas creadas como libres</span>
                  <span>Entrada ↑</span>
                </div>
              </div>

              <p className="text-xs text-[#666E7A] flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[#EAA228]" />
                <span>Este es tu punto de partida. Ajusta la distribución en Mesas cuando termines.</span>
              </p>
            </div>
          )}

          {/* ===================================================================
              PASO 3: TU CARTA (CATEGORÍAS CON ICONOS Y ESTACIÓN)
          =================================================================== */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-[#181C20] tracking-tight">
                  Dale forma a tu carta.
                </h2>
                <p className="text-xs sm:text-sm text-[#5A6370]">
                  Te proponemos tres categorías para empezar. Los productos se agregan después.
                </p>
              </div>

              {/* Lista de Categorías */}
              <div className="space-y-3 pt-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="rounded-2xl border border-[#EAE5DE] bg-white p-4 flex items-center justify-between shadow-xs hover:border-[#EAA228] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#FEF9EE] text-[#EAA228] flex items-center justify-center font-bold shrink-0">
                        {cat.iconType === 'coffee' && <Coffee className="h-5 w-5" />}
                        {cat.iconType === 'utensils' && <UtensilsCrossed className="h-5 w-5" />}
                        {cat.iconType === 'cake' && <Cake className="h-5 w-5" />}
                        {cat.iconType === 'custom' && <UtensilsCrossed className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-[#181C20]">
                          {cat.name}
                        </h4>
                        <p className="text-xs text-[#666E7A]">{cat.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-[#FAF7F2] border border-[#EAE5DE] text-[#666E7A] text-[11px] font-bold px-2.5 py-1 capitalize">
                        {cat.station}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-[#8C95A3] hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Formulario Agregar Categoría Personalizada */}
                {isAddingCategory ? (
                  <div className="rounded-2xl border-2 border-dashed border-[#EAA228] bg-[#FAF7F2] p-4 space-y-3">
                    <span className="text-xs font-black text-[#181C20]">Nueva Categoría</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Ej. Entradas, Vinos..."
                        className="sm:col-span-2 h-10 px-3 rounded-lg border border-[#D9D3C7] bg-white text-xs font-bold text-[#181C20]"
                      />
                      <select
                        value={newCatStation}
                        onChange={(e) => setNewCatStation(e.target.value as 'cocina' | 'barra')}
                        className="h-10 px-2 rounded-lg border border-[#D9D3C7] bg-white text-xs font-bold text-[#181C20]"
                      >
                        <option value="cocina">Cocina</option>
                        <option value="barra">Barra</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="h-8 px-3 text-xs font-bold text-[#666E7A] hover:bg-white rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="h-8 px-4 text-xs font-black bg-[#EAA228] text-[#181C20] rounded-lg hover:bg-[#D99318]"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="w-full sm:w-auto h-11 px-5 rounded-xl border border-dashed border-[#D9D3C7] hover:border-[#EAA228] bg-white text-xs font-bold text-[#181C20] hover:bg-[#FAF7F2] transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4 text-[#EAA228]" />
                    <span>Agregar categoría</span>
                  </button>
                )}

                {/* Callout CSV */}
                <div className="rounded-2xl bg-[#FAF7F2] border border-[#EAE5DE] p-4 flex items-center gap-3 text-xs text-[#666E7A] mt-4">
                  <span className="font-black text-[#181C20] shrink-0">≡</span>
                  <span>Después podrás agregar fotos, precios y productos, o importar tu catálogo por CSV.</span>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              PASO 4: TU CUENTA (DATOS DEL DUEÑO / OWNER Y ACTIVACIÓN)
          =================================================================== */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-[#181C20] tracking-tight">
                  Tu equipo empieza contigo.
                </h2>
                <p className="text-xs sm:text-sm text-[#5A6370]">
                  Crea la cuenta owner para administrar {restaurantName || 'tu restaurante'} y activar tu prueba.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                {/* Nombre y Rol */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-9 space-y-1.5">
                    <label className="block text-xs font-extrabold text-[#181C20]">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Daniela Vega"
                      className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-white text-sm font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="block text-xs font-extrabold text-[#666E7A]">
                      Tu rol
                    </label>
                    <div className="h-12 rounded-xl bg-[#FAF7F2] border border-[#EAE5DE] px-3.5 flex items-center gap-2 text-xs font-black text-[#181C20]">
                      <ShieldCheck className="h-4 w-4 text-[#EAA228]" />
                      <span>Owner</span>
                    </div>
                  </div>
                </div>

                {/* Correo de acceso */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-[#181C20]">
                    Correo de acceso
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="daniela@cafedelaplaza.example"
                    className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-white text-sm font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                  />
                </div>

                {/* Contraseña */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-[#181C20]">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-12 px-4 pr-11 rounded-xl border border-[#D9D3C7] bg-white text-sm font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C95A3] hover:text-[#181C20]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#666E7A]">
                    Usa al menos 8 caracteres con letras y números.
                  </p>
                </div>

                {/* Tarjeta Destacada 14 Días */}
                <div className="rounded-2xl bg-[#FEF9EE] border border-[#F6E3B8] p-4 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#EAA228] text-[#181C20] flex items-center justify-center font-black shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#181C20]">
                      14 días para conocer Paktak Tech
                    </h4>
                    <p className="text-xs text-[#7A642B]">
                      Activación al crear tu cuenta. Sin tarjeta de crédito.
                    </p>
                  </div>
                </div>

                {/* Checkbox Términos */}
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#555E6B] pt-1">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 rounded border-[#D9D3C7] text-[#EAA228] focus:ring-[#EAA228]"
                  />
                  <span>
                    Acepto los Términos de servicio y la Política de privacidad de Paktak Tech.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            BARRA DE ACCIONES INFERIOR (ATRÁS / GUARDAR Y CONTINUAR)
        ========================================================================= */}
        <div className="pt-10 border-t border-[#EAE5DE] flex items-center justify-between">
          {step === 1 ? (
            <Link
              href="/"
              className="text-xs font-bold text-[#666E7A] hover:text-[#181C20] transition-colors"
            >
              Volver al inicio
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep((step - 1) as 1 | 2 | 3)}
              className="text-xs font-bold text-[#666E7A] hover:text-[#181C20] transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Atrás</span>
            </button>
          )}

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-[11px] font-medium text-[#8C95A3]">
              Tu configuración se conserva al avanzar.
            </span>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as 2 | 3 | 4)}
                className="h-12 px-6 rounded-xl bg-[#EAA228] text-[#181C20] font-black text-xs hover:bg-[#D99318] shadow-sm hover:shadow transition-all flex items-center gap-2"
              >
                <span>Guardar y continuar</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinishOnboarding}
                className="h-12 px-7 rounded-xl bg-[#EAA228] text-[#181C20] font-black text-xs hover:bg-[#D99318] shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-[#181C20] border-t-transparent animate-spin" />
                    <span>Activando tu local...</span>
                  </>
                ) : (
                  <>
                    <span>Crear cuenta y activar prueba</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
