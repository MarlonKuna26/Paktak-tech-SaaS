export type TableStatus = 'libre' | 'ocupada' | 'reservada';

export type TableKitchenStatus = 'pendiente' | 'preparando' | 'listo' | 'servido';

export type RestaurantTable = {
  id: string;
  restaurant_id: string;
  table_number: number;
  capacity: number;
  status: TableStatus;
  zone: string | null;
  active_reservation?: {
    id: string;
    customer_name: string;
    customer_phone: string;
    date_time: string;
    guests: number;
    notes: string | null;
  } | null;
  active_order?: {
    id: string;
    order_number: number;
    total_cents: number;
    kitchen_status: TableKitchenStatus;
    items_count: number;
    ready_items_count: number;
  } | null;
};

export type AvailableReservation = {
  id: string;
  customer_name: string;
  customer_phone: string;
  date_time: string;
  guests: number;
  notes: string | null;
  status: string;
};
