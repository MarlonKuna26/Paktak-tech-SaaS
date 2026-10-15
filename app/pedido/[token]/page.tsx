import { OrderTracker } from '@/components/orders/order-tracker';
import { connection } from 'next/server';
import { Suspense } from 'react';

export default function OrderTokenPage({ params }: { params: Promise<{ token: string }> }) {
  return <Suspense fallback={<main className="min-h-screen bg-muted/30" />}><OrderTokenShell params={params} /></Suspense>;
}

async function OrderTokenShell({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Paktak Tech</p>
          <h1 className="text-3xl font-semibold tracking-tight">Estado de mi pedido</h1>
          <p className="mt-2 text-muted-foreground">Confirma tu teléfono para consultar el estado.</p>
        </div>
        <OrderTracker initialCode={token} />
      </div>
    </main>
  );
}
