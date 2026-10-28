export type PublicMenuCategory = {
  id: string;
  name: string;
  sort_order: number;
};

export type PublicMenuProduct = {
  id: string;
  category_id: string | null;
  category_name?: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  original_price_cents?: number | null;
  image_url?: string | null;
  station: 'cocina' | 'barra';
};

export type CartItem = PublicMenuProduct & {
  quantity: number;
  notes: string;
  options?: string[];
};
