'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } =
      await createSupabaseBrowserClient().auth.updateUser({ password });

    if (updateError) {
      setError('No pudimos actualizar la contraseña. Solicita un nuevo enlace.');
      setIsSubmitting(false);
      return;
    }

    router.replace('/auth/login?message=Contraseña%20actualizada');
  }

  return (
    <section className="w-full max-w-md rounded-[28px] border border-[#EAE5DE] bg-white p-7 sm:p-9 shadow-[0_12px_40px_rgba(24,28,32,0.06)] space-y-6">
      <div className="space-y-3">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EAA228] text-[#181C20] flex items-center justify-center font-black text-base shadow-sm">
            P
          </div>
          <span className="font-extrabold text-base tracking-tight text-[#181C20]">
            Paktak Tech
          </span>
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[#181C20]">
            Nueva contraseña
          </h1>
          <p className="text-xs text-[#666E7A]">
            Ingresa y confirma tu nueva clave de acceso.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="block text-xs font-extrabold text-[#181C20]">
            Contraseña nueva
          </label>
          <input
            required
            minLength={6}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••••"
            className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-sm font-semibold text-[#181C20] outline-none focus:ring-2 focus:ring-[#EAA228] focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-extrabold text-[#181C20]">
            Confirmar contraseña
          </label>
          <input
            required
            minLength={6}
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="••••••••••••"
            className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-sm font-semibold text-[#181C20] outline-none focus:ring-2 focus:ring-[#EAA228] focus:border-transparent transition-all"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] font-black text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
        </button>
      </form>
    </section>
  );
}
