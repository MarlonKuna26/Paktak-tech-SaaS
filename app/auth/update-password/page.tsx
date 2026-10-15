'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
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
    <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium text-primary">Paktak Tech</p>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva contraseña</h1>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm font-medium">
          Contraseña nueva
          <input
            required
            minLength={6}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-md border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Confirmar contraseña
          <input
            required
            minLength={6}
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="h-11 w-full rounded-md border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </section>
  );
}
