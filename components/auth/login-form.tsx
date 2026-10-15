'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams.get('error') ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('El correo o la contraseña no son correctos.');
      setIsSubmitting(false);
      return;
    }

    router.replace(searchParams.get('next') ?? '/admin');
    router.refresh();
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
      <label className="block space-y-2 text-sm font-medium">
        Contraseña
        <input
          required
          minLength={6}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 w-full rounded-md border bg-background px-3 font-normal outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Ingresando...' : 'Ingresar'}
      </button>
      <Link
        href="/auth/forgot-password"
        className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
