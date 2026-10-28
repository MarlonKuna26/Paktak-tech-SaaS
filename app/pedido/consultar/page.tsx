import { OrderTracker } from '@/components/orders/order-tracker';
import Link from 'next/link';

export default function TrackOrderPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] px-4 py-12 md:py-16 font-sans text-[#181C20] selection:bg-[#EAA228] selection:text-[#181C20]">
      <div className="mx-auto max-w-xl space-y-8">
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EAA228] text-[#181C20] flex items-center justify-center font-black text-sm shadow-xs">
              P
            </div>
            <span className="font-extrabold text-sm tracking-tight text-[#181C20]">
              Paktak Tech
            </span>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#181C20]">
              Consultar mi pedido
            </h1>
            <p className="text-sm text-[#666E7A]">
              Ingresa el código único y el número de teléfono que registraste al hacer tu pedido.
            </p>
          </div>
        </div>

        <OrderTracker />
      </div>
    </main>
  );
}

