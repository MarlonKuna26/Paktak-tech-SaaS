import { offlineDb, type OutboxMutation, type LocalOrder } from './db';

type SyncListener = (status: {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
}) => void;

class OutboxSyncEngine {
  private isOnline = true;
  private isSyncing = false;
  private lastSyncedAt: Date | null = null;
  private listeners: Set<SyncListener> = new Set();
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;

      window.addEventListener('online', () => {
        void this.checkConnectionAndSync();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notify();
      });

      // Ticker periódico cada 4 segundos
      this.timer = setInterval(() => {
        void this.checkConnectionAndSync();
      }, 4000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notifySingle(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifySingle(listener: SyncListener) {
    const pendingCount = await this.getPendingCount();
    listener({
      isOnline: this.isOnline,
      pendingCount,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
    });
  }

  private async notify() {
    const pendingCount = await this.getPendingCount();
    for (const listener of this.listeners) {
      listener({
        isOnline: this.isOnline,
        pendingCount,
        isSyncing: this.isSyncing,
        lastSyncedAt: this.lastSyncedAt,
      });
    }
  }

  public async getPendingCount(): Promise<number> {
    try {
      return await offlineDb.outbox
        .where('status')
        .equals('pending')
        .or('status')
        .equals('failed')
        .count();
    } catch {
      return 0;
    }
  }

  // Verifica conectividad real con un ping HTTP
  public async probeRealInternet(): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    if (!navigator.onLine) {
      this.isOnline = false;
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('/api/mesero/ping', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      this.isOnline = res.ok;
      return res.ok;
    } catch {
      this.isOnline = false;
      return false;
    }
  }

  // Encolar una mutación en Dexie Outbox
  public async enqueue(mutation: Omit<OutboxMutation, 'status' | 'attempts' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = Date.now();
    const fullMutation: OutboxMutation = {
      ...mutation,
      status: 'pending',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    await offlineDb.outbox.put(fullMutation);
    this.notify();
    void this.checkConnectionAndSync();
  }

  // Procesar cola Outbox
  public async checkConnectionAndSync(): Promise<void> {
    if (this.isSyncing) return;

    const hasNet = await this.probeRealInternet();
    this.notify();
    if (!hasNet) return;

    try {
      const pending = await offlineDb.outbox
        .where('status')
        .equals('pending')
        .or('status')
        .equals('failed')
        .sortBy('createdAt');

      if (!pending.length) return;

      this.isSyncing = true;
      this.notify();

      // Enviar lote a la API
      const res = await fetch('/api/mesero/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutations: pending }),
      });

      if (!res.ok) {
        // Falló la petición general: aplicar backoff
        for (const mut of pending) {
          const nextAttempts = mut.attempts + 1;
          await offlineDb.outbox.update(mut.id, {
            status: 'failed',
            attempts: nextAttempts,
            lastError: `HTTP Error ${res.status}`,
            updatedAt: Date.now(),
          });
        }
        return;
      }

      const body = (await res.json()) as {
        success: boolean;
        processedIds: string[];
        errors?: Array<{ id: string; error: string }>;
      };

      if (body.processedIds && body.processedIds.length > 0) {
        const processedSet = new Set(body.processedIds);
        for (const mut of pending) {
          if (processedSet.has(mut.id)) {
            // Eliminar de la cola outbox
            await offlineDb.outbox.delete(mut.id);

            // Actualizar local order como sincronizada
            if (mut.payload.orderId) {
              await offlineDb.localOrders.update(mut.payload.orderId, {
                isSynced: true,
              });
            }
          }
        }
        this.lastSyncedAt = new Date();
      }

      if (body.errors && body.errors.length > 0) {
        for (const err of body.errors) {
          await offlineDb.outbox.update(err.id, {
            status: 'failed',
            lastError: err.error,
            updatedAt: Date.now(),
          });
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error de red';
      // Registrar fallo en mutaciones
      const pending = await offlineDb.outbox
        .where('status')
        .equals('pending')
        .toArray();
      for (const mut of pending) {
        await offlineDb.outbox.update(mut.id, {
          status: 'failed',
          attempts: mut.attempts + 1,
          lastError: msg,
          updatedAt: Date.now(),
        });
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const syncEngine = new OutboxSyncEngine();
