'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { RestaurantTable, TableStatus, AvailableReservation } from '@/lib/tables/types';
import type { StaffRole } from '@/lib/auth/get-current-staff';

const statusConfig: Record<
  TableStatus,
  { label: string; bgClass: string; borderClass: string; textClass: string; dotClass: string }
> = {
  libre: {
    label: 'Libre',
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
  ocupada: {
    label: 'Ocupada',
    bgClass: 'bg-rose-500/10 dark:bg-rose-500/20',
    borderClass: 'border-rose-500/30',
    textClass: 'text-rose-700 dark:text-rose-400',
    dotClass: 'bg-rose-500',
  },
  reservada: {
    label: 'Reservada',
    bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
};

export function TableManager({
  restaurantId,
  userRole,
}: {
  restaurantId: string;
  userRole: StaffRole;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [unassignedReservations, setUnassignedReservations] = useState<AvailableReservation[]>([]);
  const [activePaletas, setActivePaletas] = useState<
    Array<{
      id: string;
      tracking_code: string;
      customer_name: string;
      table_or_token_number: string;
      status: string;
      created_at: string;
      total_cents: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'todas' | TableStatus>('todas');
  const [selectedZone, setSelectedZone] = useState<string>('todas');

  // Estado para crear mesa
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newZone, setNewZone] = useState('Salón Principal');
  const [isCreating, setIsCreating] = useState(false);

  // Estado para asignar reserva
  const [assigningTable, setAssigningTable] = useState<RestaurantTable | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const canManage = ['owner', 'admin', 'host'].includes(userRole);

  const loadTables = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch('/api/tables');
      if (res.ok) {
        const body = (await res.json()) as { tables: RestaurantTable[] };
        setTables(body.tables || []);
      }

      // Cargar paletas de madera en salón
      const { data: paletasData } = await supabase
        .from('public_order_requests')
        .select('id, tracking_code, customer_name, table_or_token_number, status, created_at, total_cents')
        .eq('restaurant_id', restaurantId)
        .eq('service_type', 'paleta_madera')
        .not('table_or_token_number', 'is', null)
        .in('status', ['confirmado', 'preparando', 'listo']);

      if (paletasData) {
        setActivePaletas(
          paletasData as Array<{
            id: string;
            tracking_code: string;
            customer_name: string;
            table_or_token_number: string;
            status: string;
            created_at: string;
            total_cents: number;
          }>,
        );
      }
    } catch {
      // Ignorar error de red en polling silencioso
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [restaurantId, supabase]);

  async function releasePaleta(orderId: string, tokenNum: string) {
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completado' }),
      });
      setSuccessMsg(`Paleta #${tokenNum} recogida y liberada.`);
      await loadTables(true);
    } catch {
      setError('No se pudo liberar la paleta.');
    }
  }

  const loadUnassignedReservations = useCallback(async () => {
    try {
      const res = await fetch('/api/reservations/unassigned');
      if (res.ok) {
        const body = (await res.json()) as { reservations: AvailableReservation[] };
        setUnassignedReservations(body.reservations || []);
      }
    } catch {
      // Ignorar
    }
  }, []);

  // Carga inicial y subscripción a Realtime
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTables();
      void loadUnassignedReservations();
    }, 0);

    // 1. Canal Supabase Realtime para cambios instantáneos
    const channel = supabase
      .channel(`realtime-tables-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          void loadTables(true);
        },
      )
      .subscribe();

    // 2. Polling de respaldo cada 6 segundos
    const interval = setInterval(() => {
      void loadTables(true);
      void loadUnassignedReservations();
    }, 6000);

    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadTables, loadUnassignedReservations, restaurantId, supabase]);

  // Cambiar estado de mesa
  async function updateTableStatus(tableId: string, nextStatus: TableStatus) {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/tables/${tableId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'No se pudo actualizar el estado de la mesa.');
        return;
      }
      await loadTables(true);
      await loadUnassignedReservations();
    } catch {
      setError('Error de conexión al actualizar la mesa.');
    }
  }

  // Crear nueva mesa
  async function handleCreateTable(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const num = parseInt(newTableNumber, 10);
    const cap = parseInt(newCapacity, 10);

    if (isNaN(num) || num <= 0) {
      setError('Ingresa un número de mesa válido mayor a 0.');
      return;
    }
    if (isNaN(cap) || cap <= 0) {
      setError('Ingresa una capacidad de comensales válida mayor a 0.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: num,
          capacity: cap,
          zone: newZone.trim() || undefined,
        }),
      });

      const body = (await res.json()) as { error?: string };
      setIsCreating(false);

      if (!res.ok) {
        setError(body.error ?? 'No se pudo crear la mesa.');
        return;
      }

      setSuccessMsg(`Mesa #${num} creada correctamente.`);
      setShowAddModal(false);
      setNewTableNumber('');
      await loadTables();
    } catch {
      setIsCreating(false);
      setError('Error de red al crear la mesa.');
    }
  }

  // Asignar reserva a mesa
  async function handleAssignReservation(reservationId: string) {
    if (!assigningTable) return;
    setError('');
    setSuccessMsg('');
    setIsAssigning(true);

    try {
      const res = await fetch(`/api/tables/${assigningTable.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      });

      const body = (await res.json()) as { error?: string; message?: string };
      setIsAssigning(false);

      if (!res.ok) {
        setError(body.error ?? 'No se pudo asignar la reserva a esta mesa.');
        return;
      }

      setSuccessMsg(body.message ?? 'Reserva asignada exitosamente.');
      setAssigningTable(null);
      await loadTables();
      await loadUnassignedReservations();
    } catch {
      setIsAssigning(false);
      setError('Error de red al asignar la reserva.');
    }
  }

  // Métricas
  const totalTables = tables.length;
  const freeTables = tables.filter((t) => t.status === 'libre').length;
  const occupiedTables = tables.filter((t) => t.status === 'ocupada').length;
  const reservedTables = tables.filter((t) => t.status === 'reservada').length;
  const totalCapacity = tables.reduce((acc, t) => acc + t.capacity, 0);
  const occupancyPercentage = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  // Extraer zonas únicas
  const zones = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.zone) set.add(t.zone);
    });
    return Array.from(set);
  }, [tables]);

  // Filtrado de mesas
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchStatus = statusFilter === 'todas' || t.status === statusFilter;
      const matchZone = selectedZone === 'todas' || (t.zone || 'Sin zona') === selectedZone;
      return matchStatus && matchZone;
    });
  }, [tables, statusFilter, selectedZone]);

  return (
    <div className="space-y-6">
      {/* Tarjetas de Métricas KPI del Salón */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Total Mesas</p>
          <p className="mt-1 text-2xl font-bold">{totalTables}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{occupancyPercentage}% ocupación</p>
        </div>

        <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Libres</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-300">{freeTables}</p>
          <p className="mt-1 text-[11px] text-emerald-600/80">Listas para sentar</p>
        </div>

        <div className="rounded-xl border bg-rose-500/10 border-rose-500/20 p-4 shadow-sm">
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">Ocupadas</p>
          <p className="mt-1 text-2xl font-bold text-rose-800 dark:text-rose-300">{occupiedTables}</p>
          <p className="mt-1 text-[11px] text-rose-600/80">Clientes comiendo</p>
        </div>

        <div className="rounded-xl border bg-amber-500/10 border-amber-500/20 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Reservadas</p>
          <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-300">{reservedTables}</p>
          <p className="mt-1 text-[11px] text-amber-600/80">En espera de cliente</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Capacidad Total</p>
          <p className="mt-1 text-2xl font-bold">{totalCapacity}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">asientos en el local</p>
        </div>
      </div>

      {/* Avisos */}
      {error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {successMsg && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {successMsg}
        </div>
      )}

      {/* Barra de Filtros y Acciones */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Estado */}
          <div className="inline-flex rounded-lg border bg-card p-1 text-xs">
            {(['todas', 'libre', 'ocupada', 'reservada'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'todas' ? 'Todas' : statusConfig[st].label}
              </button>
            ))}
          </div>

          {/* Filtro por Zona */}
          {zones.length > 0 && (
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="h-8 rounded-lg border bg-card px-2.5 text-xs text-foreground focus:outline-none"
            >
              <option value="todas">Todas las zonas</option>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Realtime activo
          </span>

          {canManage && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              + Nueva Mesa
            </button>
          )}
        </div>
      </div>

      {/* SECCIÓN: Paletas / Fichas de Madera en Salón (Modo Fast Casual) */}
      {activePaletas.length > 0 && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🪵</span>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Paletas / Fichas de Madera en Circulación ({activePaletas.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Clientes sentados en el salón comiendo con número móvil. Al limpiar la mesa o recoger el número, presiona &ldquo;Liberar&rdquo;.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              {activePaletas.length} mesas ocupadas
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pt-1">
            {activePaletas.map((pal) => (
              <div
                key={pal.id}
                className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-card p-3.5 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-extrabold text-amber-800 dark:text-amber-300">
                      🪵 Paleta #{pal.table_or_token_number}
                    </span>
                    <span className="text-[10px] rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
                      {new Date(pal.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-semibold">{pal.customer_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Código: {pal.tracking_code} · ${(pal.total_cents / 100).toFixed(2)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void releasePaleta(pal.id, pal.table_or_token_number)}
                  className="mt-3 h-8 w-full rounded-lg bg-emerald-600 px-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  ✓ Recoger Paleta y Liberar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Grid Visual de Mesas */}
      {loading && !tables.length ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Cargando mesas del restaurante...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredTables.map((table) => {
            const config = statusConfig[table.status];
            const hasReservation = table.status === 'reservada' && table.active_reservation;

            return (
              <article
                key={table.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${config.borderClass} ${config.bgClass}`}
              >
                {/* Cabecera de la Mesa */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {table.zone || 'Salón'}
                      </span>
                      <h3 className="text-2xl font-extrabold tracking-tight">Mesa #{table.table_number}</h3>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
                      <span className={`h-2 w-2 rounded-full ${config.dotClass}`} />
                      <span className={config.textClass}>{config.label}</span>
                    </div>
                  </div>

                  {/* Capacidad */}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                    </svg>
                    <span>Capacidad: {table.capacity} comensales</span>
                  </div>

                  {/* Si tiene reserva asignada */}
                  {hasReservation && (
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-background/90 p-3 text-xs shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-800 dark:text-amber-300">
                          {table.active_reservation?.customer_name}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(table.active_reservation?.date_time || '').toLocaleTimeString('es-EC', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {table.active_reservation?.guests} personas · Tel: {table.active_reservation?.customer_phone}
                      </p>
                      {table.active_reservation?.notes && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground">
                          Nota: {table.active_reservation.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Botones de Cambio de Estado Rápido */}
                <div className="mt-4 border-t border-border/40 pt-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {table.status === 'libre' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void updateTableStatus(table.id, 'ocupada')}
                          className="h-8 rounded-lg bg-rose-600 px-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
                        >
                          Sentar Clientes
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssigningTable(table)}
                          className="h-8 rounded-lg border border-amber-500/50 bg-background px-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                          Asignar Reserva
                        </button>
                      </>
                    )}

                    {table.status === 'ocupada' && (
                      <button
                        type="button"
                        onClick={() => void updateTableStatus(table.id, 'libre')}
                        className="col-span-2 h-8 rounded-lg bg-emerald-600 px-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                      >
                        ✓ Liberar Mesa (Cuenta Pagada)
                      </button>
                    )}

                    {table.status === 'reservada' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void updateTableStatus(table.id, 'ocupada')}
                          className="h-8 rounded-lg bg-rose-600 px-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
                        >
                          Llegó el Cliente
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateTableStatus(table.id, 'libre')}
                          className="h-8 rounded-lg border bg-background px-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Cancelar / Liberar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!filteredTables.length && !loading && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-base font-semibold">No se encontraron mesas con los filtros seleccionados.</p>
          <p className="mt-1 text-xs">Puedes ajustar el estado o agregar una nueva mesa al restaurante.</p>
        </div>
      )}

      {/* MODAL: Crear Nueva Mesa */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold">Agregar Nueva Mesa</h3>
            <p className="mt-1 text-xs text-muted-foreground">Registra una mesa física para el control del salón.</p>

            <form onSubmit={(e) => void handleCreateTable(e)} className="mt-4 space-y-3">
              <div>
                <label htmlFor="modalTableNum" className="block text-xs font-medium text-muted-foreground mb-1">
                  Número de Mesa *
                </label>
                <input
                  id="modalTableNum"
                  type="number"
                  min="1"
                  max="999"
                  required
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="Ej. 2"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label htmlFor="modalCapacity" className="block text-xs font-medium text-muted-foreground mb-1">
                  Capacidad de Comensales (Sillas) *
                </label>
                <input
                  id="modalCapacity"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  placeholder="Ej. 4"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label htmlFor="modalZone" className="block text-xs font-medium text-muted-foreground mb-1">
                  Zona / Área (Opcional)
                </label>
                <input
                  id="modalZone"
                  type="text"
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="Ej. Terraza, VIP, Salón 1"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-9 flex-1 rounded-lg border bg-background text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="h-9 flex-1 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreating ? 'Guardando...' : 'Crear Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Asignar Reserva a Mesa */}
      {assigningTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Asignar Reserva a Mesa #{assigningTable.table_number}</h3>
                <p className="text-xs text-muted-foreground">
                  Capacidad de la mesa: {assigningTable.capacity} personas · Zona: {assigningTable.zone || 'Salón'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTable(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {unassignedReservations.map((res) => {
                const exceedsCapacity = res.guests > assigningTable.capacity;
                return (
                  <div
                    key={res.id}
                    className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-sm">{res.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {res.guests} personas · Tel: {res.customer_phone}
                      </p>
                      <p className="text-[11px] font-mono text-primary">
                        Hora: {new Date(res.date_time).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {res.notes && <p className="text-[10px] italic text-muted-foreground">Nota: {res.notes}</p>}
                    </div>

                    <button
                      type="button"
                      disabled={isAssigning || exceedsCapacity}
                      onClick={() => void handleAssignReservation(res.id)}
                      className={`h-8 rounded-lg px-3 text-xs font-semibold shadow-xs transition-colors ${
                        exceedsCapacity
                          ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                      title={exceedsCapacity ? 'Excede la capacidad de la mesa' : 'Asignar'}
                    >
                      {exceedsCapacity ? 'Excede Cupo' : 'Asignar'}
                    </button>
                  </div>
                );
              })}

              {!unassignedReservations.length && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No hay reservas pendientes sin mesa asignada para hoy.
                </div>
              )}
            </div>

            <div className="mt-4 border-t pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setAssigningTable(null)}
                className="h-8 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
