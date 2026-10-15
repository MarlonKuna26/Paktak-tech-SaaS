export type PublicMenuProduct = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  station: 'cocina' | 'barra';
};

export type CartItem = PublicMenuProduct & {
  quantity: number;
  notes: string;
};
