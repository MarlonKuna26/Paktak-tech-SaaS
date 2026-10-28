'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });

    if (resetError) {
      setError('No pudimos enviar el enlace. Revisa el correo e inténtalo de nuevo.');
    } else {
      setMessage('Si el correo está registrado, recibirás un enlace de recuperación en tu bandeja de entrada.');
    }
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="block text-xs font-extrabold text-[#181C20]">
          Correo electrónico
        </label>
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@demo.com"
          className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-sm font-semibold text-[#181C20] outline-none focus:ring-2 focus:ring-[#EAA228] focus:border-transparent transition-all"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-600">
          {error}
        </div>
      )}

      {message && (
        <div role="status" className="rounded-xl bg-[#EBF7EE] border border-[#28A745]/30 p-3.5 text-xs font-bold text-[#1E7E34]">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] font-black text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
      </button>

      <div className="pt-2 text-center">
        <Link
          href="/auth/login"
          className="text-xs font-bold text-[#666E7A] hover:text-[#181C20] transition-colors"
        >
          ← Volver a iniciar sesión
        </Link>
      </div>
    </form>
  );
}
