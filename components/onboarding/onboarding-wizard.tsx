'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const DEFAULT_CATEGORIES = [
  'Hamburguesas & Sandwiches',
  'Pizzas & Pastas',
  'Platos Fuertes & Cortes',
  'Alitas & Snacks',
  'Bebidas & Coctelería',
  'Postres & Cafetería',
];

export function OnboardingWizard({ initialUserEmail }: { initialUserEmail?: string | null }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [tablesCount, setTablesCount] = useState(8);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Hamburguesas & Sandwiches',
    'Bebidas & Coctelería',
    'Postres & Cafetería',
  ]);
  const [newCatInput, setNewCatInput] = useState('');

  // Autenticación si no está logueado
  const [email, setEmail] = useState(initialUserEmail || '');
  const [password, setPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (name: string) => {
    setRestaurantName(name);
    // Auto-generar slug
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatInput.trim() && !selectedCategories.includes(newCatInput.trim())) {
      setSelectedCategories([...selectedCategories, newCatInput.trim()]);
      setNewCatInput('');
    }
  };

  const handleFinishOnboarding = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      // 1. Si no hay usuario activo, registrarlo o autenticarlo primero
      if (!initialUserEmail) {
        if (!email.trim() || !password.trim()) {
          setError('Por favor ingresa tu correo y una contraseña segura para tu cuenta de dueño.');
          setIsSubmitting(false);
          return;
        }

        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (authErr) {
          throw new Error(authErr.message);
        }

        if (!authData.user) {
          throw new Error('No se pudo crear la cuenta de administrador.');
        }
      }

      // 2. Invocar API de Onboarding
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: restaurantName,
          slug,
          phone,
          address,
          tablesCount,
          categories: selectedCategories,
        }),
      });

      const body = (await res.json()) as { error?: string; success?: boolean };

      if (!res.ok || !body.success) {
        throw new Error(body.error || 'No se pudo completar el registro del restaurante.');
      }

      // 3. Éxito, redirigir a panel
      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado durante el registro.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
      {/* Progress Stepper Bar */}
      <div className="border-b border-zinc-100 dark:border-zinc-800 p-6 bg-zinc-50 dark:bg-zinc-800/40">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {[
            { stepNum: 1, label: 'Datos' },
            { stepNum: 2, label: 'Mesas' },
            { stepNum: 3, label: 'Menú' },
            { stepNum: 4, label: 'Activar' },
          ].map((item, idx) => (
            <div key={item.stepNum} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  step === item.stepNum
                    ? 'bg-[#f3a806] text-zinc-950 shadow-sm'
                    : step > item.stepNum
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {step > item.stepNum ? <Check className="h-3.5 w-3.5" /> : item.stepNum}
              </div>
              <span className="text-xs font-semibold hidden sm:inline text-zinc-700 dark:text-zinc-300">
                {item.label}
              </span>
              {idx < 3 && <div className="w-6 sm:w-10 h-0.5 bg-zinc-200 dark:bg-zinc-700 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Wizard Step Content */}
      <div className="p-6 sm:p-10">
        {error && (
          <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* PASO 1: Datos Básicos */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#f3a806]">Paso 1 de 4</span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                ¿Cómo se llama tu restaurante?
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Crearemos tu espacio seguro en la nube y la dirección web de tu menú digital.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Nombre Comercial del Restaurante *
                </label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Los Champiz Burger & Grill"
                  required
                  className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Identificador Web (Slug de tu Menú Digital) *
                </label>
                <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 text-xs text-zinc-500">
                  <span>paktak.tech/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="los-champiz"
                    required
                    className="flex-1 h-11 bg-transparent border-0 px-1 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Tus clientes entrarán a este link para ver el menú y hacer pedidos desde el QR.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Teléfono o WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+593 999999999"
                    className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 text-xs font-medium text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Ciudad / Dirección
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej: Ambato, Tisaleo"
                    className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 text-xs font-medium text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                type="button"
                disabled={!restaurantName.trim() || !slug.trim()}
                onClick={() => setStep(2)}
                className="h-11 px-8 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                Continuar al Salón →
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: Configuración de Mesas */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#f3a806]">Paso 2 de 4</span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                ¿Cuántas mesas tiene tu local?
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Autogeneraremos el plano digital de mesas para tus meseros y anfitriones.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-4 gap-3">
                {[4, 8, 12, 16].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTablesCount(num)}
                    className={`h-16 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      tablesCount === num
                        ? 'border-[#f3a806] bg-amber-500/10 font-bold text-zinc-950 dark:text-white shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <span className="text-lg">🪑</span>
                    <span className="text-xs font-bold">{num} mesas</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  O ajusta el número exacto:
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={tablesCount}
                  onChange={(e) => setTablesCount(Math.max(1, Math.min(30, Number(e.target.value))))}
                  className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 text-xs font-bold text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-4">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Configuración lista:
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Se crearán las mesas del 1 al {tablesCount} con capacidad de 4 personas cada una en el Salón Principal. Podrás modificar su capacidad y agregar más zonas luego desde el panel.
                </p>
              </div>
            </div>

            <div className="pt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-11 px-6 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="h-11 px-8 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-xs shadow-md transition-all"
              >
                Continuar al Menú →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Menú y Categorías */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#f3a806]">Paso 3 de 4</span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                Elige las secciones de tu Menú
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Selecciona las categorías iniciales. Podrás cargar tus platos y precios inmediatamente después.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEFAULT_CATEGORIES.map((cat) => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <div
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[#f3a806] bg-amber-500/10 text-zinc-900 dark:text-zinc-100 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                      }`}
                    >
                      <span className="text-xs">{cat}</span>
                      <span className="text-xs">{isChecked ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span>
                    </div>
                  );
                })}
              </div>

              {/* Agregar categoría personalizada */}
              <div className="pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    placeholder="Otra categoría (ej. Menús Ejecutivos)"
                    className="flex-1 h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold hover:bg-zinc-100"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-11 px-6 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ← Atrás
              </button>
              <button
                type="button"
                disabled={selectedCategories.length === 0}
                onClick={() => setStep(4)}
                className="h-11 px-8 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                Finalizar y Activar →
              </button>
            </div>
          </div>
        )}

        {/* PASO 4: Cuenta de Dueño & Activación de Trial */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Paso 4 de 4 · ¡Todo listo!</span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                Activa tus 14 Días de Prueba Gratis
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Sin tarjeta de crédito requerida. Acceso inmediato a todas las funciones profesionales.
              </p>
            </div>

            {/* Si no está autenticado, pedir credenciales */}
            {!initialUserEmail && (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-4 space-y-3">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Crea tu usuario de Administrador Principal (Dueño):
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dueño@mirestaurante.com"
                    required
                    className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Contraseña segura
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Resumen del Onboarding */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs space-y-2">
              <p className="font-bold text-zinc-900 dark:text-zinc-100">Resumen de tu restaurante:</p>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Restaurante:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">{restaurantName}</strong>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Menú público:</span>
                <span className="font-mono text-amber-600 font-bold">paktak.tech/{slug}/pedir</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Mesas configuradas:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">{tablesCount} mesas</strong>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Plan asignado:</span>
                <span className="text-emerald-600 font-bold">14 días de prueba completa (Trial)</span>
              </div>
            </div>

            <div className="pt-6 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="h-11 px-6 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ← Atrás
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinishOnboarding}
                className="h-12 px-8 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-sm tracking-wide shadow-lg transition-all active:scale-[0.99] flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Creando tu restaurante...</span>
                  </>
                ) : (
                  <span>Comenzar a operar ahora</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
