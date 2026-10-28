import { Suspense } from 'react';
import { connection } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

export const metadata = {
  title: 'Onboarding | Paktak Tech SaaS',
  description: 'Prepara tu local en minutos. Prueba gratuita de 14 días sin tarjeta.',
};

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#161A1E] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EAA228]" />
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

  return <OnboardingWizard initialUserEmail={user?.email || null} />;
}
