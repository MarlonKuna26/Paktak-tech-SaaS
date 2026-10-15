import { OrderTracker } from '@/components/orders/order-tracker';

export default function TrackOrderPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Paktak Tech</p>
          <h1 className="text-3xl font-semibold tracking-tight">Consultar mi pedido</h1>
          <p className="mt-2 text-muted-foreground">Usa el código y teléfono que ingresaste al pedir.</p>
        </div>
        <OrderTracker />
      </div>
    </main>
  );
}
