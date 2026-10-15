'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const { error } = await createSupabaseBrowserClient().auth.signOut();
    if (error) return;
    router.replace('/auth/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      Cerrar sesión
    </button>
  );
}
