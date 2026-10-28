import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Link from 'next/link';

export default function ForgotPasswordPage() {
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
            Recuperar contraseña
          </h1>
          <p className="text-xs text-[#666E7A]">
            Te enviaremos un enlace seguro a tu correo para restablecer tu clave.
          </p>
        </div>
      </div>

      <ForgotPasswordForm />
    </section>
  );
}
