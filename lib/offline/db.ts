import Dexie, { type Table } from 'dexie';

export type OutboxMutation = {
  id: string; // UUID de la mutación
  restaurantId: string;
  actionType: 'CREATE_ORDER' | 'ADD_ITEMS' | 'UPDATE_STATUS';
  payload: {
    orderId: string;
    tableId?: string;
    tableNumber?: number;
    waiterId: string;
    customerName?: string;
    items?: Array<{
      id: string; // UUID del item
      productId: string;
      productName: string;
      unitPriceCents: number;
      quantity: number;
      notes?: string;
    }>;
    status?: string;
    clientTimestamp: string;
  };
  status: 'pending' | 'sending' | 'failed' | 'synced';
  attempts: number;
  lastError?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type CachedProduct = {
  id: string;
  restaurantId: string;
  categoryId: string | null;
  categoryName?: string | null;
  name: string;
  description: string | null;
  priceCents: number;
  station: 'cocina' | 'barra';
  active: boolean;
  imageUrl?: string | null;
};

export type CachedTable = {
  id: string;
  restaurantId: string;
  tableNumber: number;
  capacity: number;
  status: 'libre' | 'ocupada' | 'reservada';
  zone: string | null;
};

export type LocalOrder = {
  id: string; // UUID
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  waiterId: string;
  status: 'abierta' | 'pagada' | 'cancelada';
  totalCents: number;
  customerName?: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    notes?: string;
    status: 'pendiente' | 'preparando' | 'listo' | 'entregado';
  }>;
  createdAt: string;
  isSynced: boolean;
};

export class PaktakOfflineDatabase extends Dexie {
  outbox!: Table<OutboxMutation, string>;
  cachedMenu!: Table<CachedProduct, string>;
  cachedTables!: Table<CachedTable, string>;
  localOrders!: Table<LocalOrder, string>;

  constructor() {
    super('PaktakWaiterOfflineDB');
    this.version(1).stores({
      outbox: 'id, restaurantId, status, createdAt',
      cachedMenu: 'id, restaurantId, categoryId, name',
      cachedTables: 'id, restaurantId, tableNumber, status',
      localOrders: 'id, restaurantId, tableId, status, isSynced',
    });
  }
}

export const offlineDb = new PaktakOfflineDatabase();
