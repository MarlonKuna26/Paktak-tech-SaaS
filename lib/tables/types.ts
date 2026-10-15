export type TableStatus = 'libre' | 'ocupada' | 'reservada';

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
