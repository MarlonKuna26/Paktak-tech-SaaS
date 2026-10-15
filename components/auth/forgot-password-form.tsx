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
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });

    if (resetError) {
      setError('No pudimos enviar el enlace. Revisa el correo e inténtalo de nuevo.');
    } else {
      setMessage('Si el correo está registrado, recibirás un enlace de recuperación.');
    }
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-medium">
        Correo electrónico
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 w-full rounded-md border bg-background px-3 font-normal outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="rounded-md bg-primary/10 p-3 text-sm text-primary">{message}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
      </button>
      <Link href="/auth/login" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
