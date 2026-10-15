import { Suspense } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
