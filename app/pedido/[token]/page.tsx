import { OrderTracker } from '@/components/orders/order-tracker';
import { connection } from 'next/server';
import { Suspense } from 'react';

export default function OrderTokenPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <OrderTokenShell params={params} />
    </Suspense>
  );
}

async function OrderTokenShell({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  return (
    <main className="min-h-screen bg-white text-[#1A1A1A] px-4 py-12 md:py-16">
      <div className="mx-auto max-w-xl space-y-8">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#6B6B6B]">
            Paktak Tech
          </span>
          <h1 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A1A1A]">
            Estado de mi pedido
          </h1>
          <p className="mt-2 text-base text-[#6B6B6B]">
            Seguimiento en directo con el restaurante y confirmación de estado.
          </p>
        </div>
        <OrderTracker initialCode={token} />
      </div>
    </main>
  );
}
