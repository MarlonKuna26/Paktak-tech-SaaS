import { OrderTracker } from '@/components/orders/order-tracker';
import { connection } from 'next/server';
import { Suspense } from 'react';
import Link from 'next/link';

export default function OrderTokenPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#FAF7F2]" />}>
      <OrderTokenShell params={params} />
    </Suspense>
  );
}

async function OrderTokenShell({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#181C20] px-4 py-12 md:py-16 selection:bg-[#EAA228] selection:text-[#181C20]">
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
              Estado de mi pedido
            </h1>
            <p className="text-sm text-[#666E7A]">
              Seguimiento en directo con el restaurante y confirmación de preparación en cocina.
            </p>
          </div>
        </div>

        <OrderTracker initialCode={token} />
      </div>
    </main>
  );
}

