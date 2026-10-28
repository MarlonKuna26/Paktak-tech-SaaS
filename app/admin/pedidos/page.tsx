import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Pedidos & Salón | Paktak Tech',
};

export default function OrdersRedirectPage() {
  redirect('/admin/mesas?view=pedidos');
}
