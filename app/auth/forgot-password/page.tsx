import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium text-primary">Paktak Tech</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Recuperar contraseña
        </h1>
        <p className="text-sm text-muted-foreground">
          Te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>
      <ForgotPasswordForm />
    </section>
  );
}
