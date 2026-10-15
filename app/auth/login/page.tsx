import { LoginForm } from '@/components/auth/login-form';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium text-primary">Paktak Tech</p>
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa para administrar tu restaurante.
        </p>
      </div>
      <Suspense fallback={<div className="h-48" />}>
        <LoginForm />
      </Suspense>
    </section>
  );
}
