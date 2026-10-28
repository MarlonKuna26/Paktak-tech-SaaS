'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(searchParams.get('error') ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
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
      <div className="space-y-1.5">
        <label className="block text-xs font-black text-[#181C20] uppercase tracking-wider">
          Correo electrónico
        </label>
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@demo.com"
          className="h-12 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/40 px-3.5 text-sm font-semibold text-[#181C20] placeholder:text-[#8C95A3] outline-none focus:bg-white focus:ring-2 focus:ring-[#EAA228] focus:border-transparent transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-black text-[#181C20] uppercase tracking-wider">
            Contraseña
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-[11px] font-bold text-[#666E7A] hover:text-[#181C20] transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <div className="relative">
          <input
            required
            minLength={6}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••••"
            className="h-12 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/40 px-3.5 pr-10 text-sm font-semibold text-[#181C20] placeholder:text-[#8C95A3] outline-none focus:bg-white focus:ring-2 focus:ring-[#EAA228] focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C95A3] hover:text-[#181C20] transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-600 animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] font-black text-xs uppercase tracking-wider shadow-sm hover:shadow transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting ? 'Ingresando...' : 'Ingresar al Sistema'}
      </button>

      {/* Acceso Rápido para Pruebas / Demostración */}
      <div className="pt-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C95A3] mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#EAA228]" />
          <span>Acceso rápido sugerido:</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setEmail('admin@demo.com')}
            className="rounded-lg bg-[#FAF7F2] border border-[#EAE5DE] px-2.5 py-1 text-[11px] font-bold text-[#666E7A] hover:bg-[#FEF9EE] hover:text-[#181C20] hover:border-[#EAA228] transition-colors cursor-pointer"
          >
            Admin / Dueño
          </button>
          <button
            type="button"
            onClick={() => setEmail('cajero@demo.com')}
            className="rounded-lg bg-[#FAF7F2] border border-[#EAE5DE] px-2.5 py-1 text-[11px] font-bold text-[#666E7A] hover:bg-[#FEF9EE] hover:text-[#181C20] hover:border-[#EAA228] transition-colors cursor-pointer"
          >
            Caja & Salón
          </button>
          <button
            type="button"
            onClick={() => setEmail('cocina@demo.com')}
            className="rounded-lg bg-[#FAF7F2] border border-[#EAE5DE] px-2.5 py-1 text-[11px] font-bold text-[#666E7A] hover:bg-[#FEF9EE] hover:text-[#181C20] hover:border-[#EAA228] transition-colors cursor-pointer"
          >
            Cocina (KDS)
          </button>
        </div>
      </div>
    </form>
  );
}

