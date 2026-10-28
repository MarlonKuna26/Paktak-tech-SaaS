'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
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
      className="group flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#9DA7B3] hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer"
      title="Cerrar sesión en Paktak Tech"
    >
      <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
      <span>Cerrar sesión</span>
    </button>
  );
}

