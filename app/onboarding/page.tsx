import { Suspense } from 'react';
import { connection } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import Link from 'next/link';

export const metadata = {
  title: 'Alta de Nuevo Restaurante | Paktak Tech SaaS',
  description: 'Comienza tu prueba gratuita de 14 días y configura tu restaurante en minutos.',
};

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f9fa] dark:bg-zinc-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      }
    >
      <OnboardingShell />
    </Suspense>
  );
}

async function OnboardingShell() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-zinc-950 font-sans flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#f3a806] flex items-center justify-center font-black text-zinc-950 text-xs">
            P
          </div>
          <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
            Paktak Tech <span className="text-[#f3a806] text-xs uppercase font-bold ml-1">SaaS</span>
          </span>
        </Link>

        <Link
          href="/auth/login"
          className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white"
        >
          ¿Ya tienes cuenta? Iniciar Sesión →
        </Link>
      </header>

      {/* Main Wizard */}
      <main className="flex-1 flex items-center justify-center py-4">
        <OnboardingWizard initialUserEmail={user?.email || null} />
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full pt-6 text-center text-xs text-zinc-400">
        Paktak Tech SaaS · Sistema Operativo para Restaurantes Modernos
      </footer>
    </div>
  );
}
