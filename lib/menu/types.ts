export type MenuCategory = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

export type MenuProduct = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  active: boolean;
  station: 'cocina' | 'barra';
};
