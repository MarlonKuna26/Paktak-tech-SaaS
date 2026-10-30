'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  DollarSign,
  User,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { CashShift, ShiftLiveMetrics } from '@/lib/models/cash-shift.model';
import { AlertModal } from '@/components/ui/alert-modal';

export function OpenShiftModal({
  isOpen,
  onClose,
  onShiftOpened,
  initialCashDefault,
  userRole: propUserRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  onShiftOpened: (shift: CashShift) => void;
  initialCashDefault?: number;
  userRole?: string;
}) {
  const [shiftName, setShiftName] = useState('Turno 1 (Mañana)');
  const [cashierName, setCashierName] = useState('');
  const [cashierUserId, setCashierUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>(propUserRole || '');
  const [initialCash, setInitialCash] = useState(
    initialCashDefault !== undefined ? Number(initialCashDefault).toFixed(2) : '50.00'
  );
  const [adminConfiguredCash, setAdminConfiguredCash] = useState<number | null>(
    initialCashDefault ?? null
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [staffCashiers, setStaffCashiers] = useState<
    Array<{ id: string; userId: string; fullName: string; role: string; email: string }>
  >([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    if (propUserRole) setUserRole(propUserRole);
  }, [propUserRole]);

  // Cargar cajeros creados por el administrador y configuración base de caja
  useEffect(() => {
    if (!isOpen) return;

    setLoadingStaff(true);
    fetch('/api/staff')
      .then((res) => res.json())
      .then((data) => {
        if (data.staff && Array.isArray(data.staff)) {
          const activeMembers = data.staff.filter((s: any) => s.active);
          

          // Filtrar ESTRICTAMENTE usuarios con rol 'cashier'
          const cajeros = activeMembers.filter((s: any) => s.role === 'cashier');
          setStaffCashiers(cajeros);

          if (cajeros.length > 0) {
            setCashierName(cajeros[0].fullName || cajeros[0].email);
            setCashierUserId(cajeros[0].userId);
          } else {
            setCashierName('');
            setCashierUserId(null);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStaff(false));

    // Consultar turno y rol de /api/shifts para garantizar datos actualizados
    fetch('/api/shifts')
      .then((res) => res.json())
      .then((data) => {
        if (data.userRole) {
          setUserRole((prev) => prev || data.userRole);
        }
        if (initialCashDefault === undefined && data.defaultInitialCashDollars !== undefined) {
          const val = Number(data.defaultInitialCashDollars);
          setInitialCash(val.toFixed(2));
          setAdminConfiguredCash(val);
        }
      })
      .catch(() => {});
  }, [isOpen, initialCashDefault]);

  const isAdmin = ['owner', 'admin'].includes((userRole || '').toLowerCase().trim());

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cashierName.trim()) {
      setError('Ingresa el nombre de la cajera que apertura el turno.');
      return;
    }

    const dollars = parseFloat(String(initialCash).replace(',', '.'));
    if (isNaN(dollars) || dollars < 0) {
      setError('Ingresa un monto de fondo inicial válido.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftName,
          cashierName: cashierName.trim(),
          cashierUserId: cashierUserId || undefined,
          initialCashDollars: dollars,
          notes,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'No se pudo abrir el turno.');
      }

      onShiftOpened(body.shift);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al abrir turno');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-[#EAE5DE] bg-white p-6 sm:p-7 shadow-[0_20px_50px_rgba(24,28,32,0.15)] space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF9EE] text-[#EAA228] border border-[#F6E3B8]">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#181C20]">Apertura de Turno</h2>
              <p className="text-xs text-[#666E7A]">Registra el fondo inicial de la gaveta de caja</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#8C95A3] hover:bg-[#FAF7F2] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#181C20] mb-1.5">
              Turno Operativo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Turno 1 (Mañana)', 'Turno 2 (Tarde/Noche)'].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setShiftName(name)}
                  className={`h-10 rounded-xl px-3 text-xs font-bold transition-all border cursor-pointer ${
                    shiftName === name
                      ? 'border-[#EAA228] bg-[#FEF9EE] text-[#8F5E00]'
                      : 'border-[#EAE5DE] bg-[#FAF7F2] text-[#666E7A] hover:text-[#181C20]'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="cashierSelect" className="block text-xs font-black uppercase tracking-wider text-[#181C20]">
                Cajera / Responsable del Turno
              </label>
              <span className="text-[10px] font-bold text-[#8F5E00] bg-[#FEF9EE] px-2 py-0.5 rounded-md border border-[#F6E3B8]">
                Usuarios de Personal
              </span>
            </div>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C95A3] pointer-events-none z-10" />
              {loadingStaff ? (
                <div className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2] pl-10 pr-3.5 flex items-center text-xs font-bold text-[#8C95A3]">
                  Cargando cajeras del restaurante...
                </div>
              ) : staffCashiers.length > 0 ? (
                <select
                  id="cashierSelect"
                  required
                  value={cashierName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCashierName(val);
                    const found = staffCashiers.find((s) => (s.fullName || s.email) === val);
                    setCashierUserId(found?.userId || null);
                  }}
                  className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-white pl-10 pr-8 text-xs font-bold text-[#181C20] outline-none focus:border-[#EAA228] focus:ring-2 focus:ring-[#EAA228] cursor-pointer"
                >
                  {staffCashiers.map((c) => (
                    <option key={c.id} value={c.fullName || c.email}>
                      {c.fullName || c.email} (Cajera)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2 w-full">
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs font-bold text-[#8F5E00]">
                    No hay cajeras registradas en Personal. Crea una cajera en Personal (/admin/personal).
                  </div>
                  {isAdmin && (
                    <input
                      type="text"
                      required
                      placeholder="Nombre del responsable del turno"
                      value={cashierName}
                      onChange={(e) => setCashierName(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#D9D3C7] bg-white pl-10 pr-3.5 text-xs font-bold text-[#181C20] outline-none focus:border-[#EAA228] focus:ring-2 focus:ring-[#EAA228]"
                    />
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-[10px] text-[#666E7A]">
              Selecciona la cajera registrada por el administrador en el módulo de Personal.
            </p>
          </div>

          {/* Fondo de Caja Inicial (Editable por Administrador / Solo Lectura para Cajeras) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="initialCash" className="block text-xs font-black uppercase tracking-wider text-[#181C20]">
                Fondo de Caja Inicial ($ Efectivo para dar cambio)
              </label>
              {isAdmin ? (
                <span className="text-[10px] font-bold text-[#8F5E00] bg-[#FEF9EE] px-2 py-0.5 rounded-md border border-[#F6E3B8] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#EAA228]" />
                  <span>Permiso de Administrador</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#8F5E00] bg-[#FEF9EE] px-2 py-0.5 rounded-md border border-[#F6E3B8] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#EAA228]" />
                  <span>Fijado por el Administrador</span>
                </span>
              )}
            </div>

            {isAdmin ? (
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C95A3] pointer-events-none" />
                <input
                  id="initialCash"
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="50.00"
                  value={initialCash}
                  onChange={(e) => setInitialCash(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-white pl-10 pr-3.5 text-base font-black text-[#181C20] outline-none focus:border-[#EAA228] focus:ring-2 focus:ring-[#EAA228]"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between h-12 w-full rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] px-4 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEF9EE] text-[#EAA228] border border-[#F6E3B8]">
                    <DollarSign className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <span className="text-base font-black text-[#181C20] font-mono">
                    ${Number(initialCash || 0).toFixed(2)}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#666E7A]">
                  Fondo fijo asignado
                </span>
              </div>
            )}

            <p className="mt-1 text-[11px] text-[#666E7A]">
              {isAdmin
                ? 'Como administrador, puedes ingresar o ajustar la cantidad exacta de fondo de gaveta para este turno.'
                : 'Monto configurado por el administrador en Ajustes. El personal solo visualiza el turno y el fondo base asignado a la gaveta.'}
            </p>
          </div>

          <div>
            <label htmlFor="openNotes" className="block text-xs font-black uppercase tracking-wider text-[#181C20] mb-1.5">
              Observaciones (Opcional)
            </label>
            <input
              id="openNotes"
              type="text"
              placeholder="Ej. Billetes de baja denominación y monedas recibidas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/40 px-3.5 text-xs text-[#181C20] outline-none focus:ring-2 focus:ring-[#EAA228]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || (!isAdmin && staffCashiers.length === 0)}
              className="h-12 w-full rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-xs font-black text-[#181C20] uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Abriendo turno...' : 'Confirmar Apertura de Caja'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Central de Error en Apertura de Turno */}
      <AlertModal
        isOpen={Boolean(error)}
        title="Aviso de Apertura de Caja"
        message={error}
        variant="error"
        onClose={() => setError('')}
      />
    </div>
  );
}

export function CloseShiftModal({
  isOpen,
  onClose,
  shift,
  metrics,
  onShiftClosed,
}: {
  isOpen: boolean;
  onClose: () => void;
  shift: CashShift | null;
  metrics: ShiftLiveMetrics | null;
  onShiftClosed: (closedShift: CashShift) => void;
}) {
  const [countedCash, setCountedCash] = useState('');
  const [leftForNext, setLeftForNext] = useState('50.00');
  const [closingNotes, setClosingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [occupiedTablesCount, setOccupiedTablesCount] = useState<number | null>(null);
  const [occupiedTablesList, setOccupiedTablesList] = useState<string[]>([]);
  const [isCheckingTables, setIsCheckingTables] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    async function checkOccupiedTables() {
      setIsCheckingTables(true);
      try {
        const res = await fetch('/api/tables');
        if (res.ok) {
          const body = (await res.json()) as { tables?: Array<{ status: string; table_number: number }> };
          const occ = (body.tables || []).filter((t) => t.status === 'ocupada');
          if (!isCancelled) {
            setOccupiedTablesCount(occ.length);
            setOccupiedTablesList(occ.map((t) => `#${t.table_number}`));
          }
        }
      } catch {
        // Ignorar fallo de red puntual
      } finally {
        if (!isCancelled) setIsCheckingTables(false);
      }
    }
    void checkOccupiedTables();
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  if (!isOpen || !shift) return null;

  const initialCents = shift.initial_cash_cents;
  const cashSalesCents = metrics?.cashSalesCents ?? 0;
  const expectedCents = initialCents + cashSalesCents;

  const countedDollars = parseFloat(countedCash.replace(',', '.'));
  const countedCents = !isNaN(countedDollars) && countedDollars >= 0 ? Math.round(countedDollars * 100) : null;

  const diffCents = countedCents !== null ? countedCents - expectedCents : null;

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (!shift) return;
    if (countedCents === null) {
      setError('Ingresa el monto de dinero físico que contaste en la gaveta.');
      return;
    }

    const nextDollars = parseFloat(leftForNext.replace(',', '.'));
    if (isNaN(nextDollars) || nextDollars < 0) {
      setError('Ingresa un monto válido que se deja para el siguiente turno.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: shift.id,
          finalCashDollars: countedDollars,
          leftForNextShiftDollars: nextDollars,
          notes: closingNotes,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'No se pudo cerrar el turno.');
      }

      onShiftClosed(body.shift);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cerrar turno');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-[#EAE5DE] bg-white p-6 sm:p-7 shadow-[0_20px_50px_rgba(24,28,32,0.15)] space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EBF7EE] text-[#1E7E34] border border-emerald-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#181C20]">Arqueo & Cuadre de Caja</h2>
              <p className="text-xs text-[#666E7A]">
                {shift.shift_name} · Cajera: <strong>{shift.cashier_name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#8C95A3] hover:bg-[#FAF7F2] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumen de Valores Esperados en el Turno */}
        <div className="rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-4.5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#666E7A]">
            <span>Fondo Inicial con el que abrió:</span>
            <span className="font-mono font-bold text-[#181C20]">${(initialCents / 100).toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-[#666E7A]">
            <span>+ Ventas cobradas en Efectivo:</span>
            <span className="font-mono font-bold text-emerald-700">+${(cashSalesCents / 100).toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-[#666E7A]">
            <span>Ventas cobradas en Tarjeta / Transferencia:</span>
            <span className="font-mono font-bold text-sky-700">${((metrics?.digitalSalesCents ?? 0) / 100).toFixed(2)}</span>
          </div>

          <div className="pt-2 border-t border-[#EAE5DE] flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#181C20]">
                Efectivo Total Esperado en Gaveta:
              </span>
              <p className="text-[10px] text-[#666E7A]">Fondo inicial + Cobros en efectivo</p>
            </div>
            <span className="font-mono text-xl font-black text-[#181C20]">
              ${(expectedCents / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Advertencia si hay mesas ocupadas */}
        {occupiedTablesCount !== null && occupiedTablesCount > 0 && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-rose-900">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Cierre Bloqueado: Hay {occupiedTablesCount} mesa(s) ocupada(s)</span>
            </div>
            <p className="text-xs text-rose-800">
              No puedes realizar el arqueo ni cerrar el turno mientras haya comensales en el salón ({occupiedTablesList.join(', ')}). Debes cobrar y liberar todas las mesas antes de cerrar caja.
            </p>
            <div className="pt-1">
              <a
                href="/admin/mesas"
                className="inline-flex items-center gap-1.5 text-xs font-black underline text-rose-950 hover:text-black cursor-pointer"
              >
                <span>Ir al Plano de Mesas para cobrar y liberar →</span>
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleClose} className="space-y-4">
          <div>
            <label htmlFor="countedCash" className="block text-xs font-black uppercase tracking-wider text-[#181C20] mb-1.5">
              Efectivo Físico Contado en la Gaveta ($) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C95A3]" />
              <input
                id="countedCash"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#D9D3C7] bg-white pl-10 pr-3.5 text-base font-black text-[#181C20] outline-none focus:border-transparent focus:ring-2 focus:ring-[#EAA228]"
              />
            </div>
          </div>

          {/* Resultado del Cuadre en Vivo */}
          {diffCents !== null && (
            <div
              className={`rounded-2xl p-4 border flex items-center justify-between transition-all ${
                diffCents === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : diffCents > 0
                    ? 'bg-sky-50 border-sky-200 text-sky-800'
                    : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {diffCents === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">
                    {diffCents === 0
                      ? 'Caja Cuadrada Exacta'
                      : diffCents > 0
                        ? `Sobrante en Caja`
                        : `Faltante en Caja`}
                  </p>
                  <p className="text-[11px] opacity-90">
                    {diffCents === 0
                      ? 'El dinero físico coincide perfectamente con el sistema.'
                      : diffCents > 0
                        ? `Hay $${(diffCents / 100).toFixed(2)} más de lo esperado en el sistema.`
                        : `Hacen falta $${Math.abs(diffCents / 100).toFixed(2)} en la gaveta.`}
                  </p>
                </div>
              </div>
              <span className="font-mono text-lg font-black">
                {diffCents > 0 ? `+$${(diffCents / 100).toFixed(2)}` : `$${(diffCents / 100).toFixed(2)}`}
              </span>
            </div>
          )}

          <div>
            <label htmlFor="leftForNext" className="block text-xs font-black uppercase tracking-wider text-[#181C20] mb-1.5">
              Dinero que se deja para el Siguiente Turno ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C95A3]" />
              <input
                id="leftForNext"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="50.00"
                value={leftForNext}
                onChange={(e) => setLeftForNext(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/40 pl-10 pr-3.5 text-sm font-bold text-[#181C20] outline-none focus:border-transparent focus:ring-2 focus:ring-[#EAA228]"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#666E7A]">
              Fondo base que recibe la siguiente cajera para continuar la operación.
            </p>
          </div>

          <div>
            <label htmlFor="closingNotes" className="block text-xs font-black uppercase tracking-wider text-[#181C20] mb-1.5">
              Observaciones del Cierre de Turno
            </label>
            <input
              id="closingNotes"
              type="text"
              placeholder="Ej. Entregado sin novedad a cajera del turno tarde"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/40 px-3.5 text-xs text-[#181C20] outline-none focus:ring-2 focus:ring-[#EAA228]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || (occupiedTablesCount !== null && occupiedTablesCount > 0)}
              className="h-12 w-full rounded-xl bg-[#181C20] hover:bg-black text-xs font-black text-white uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Registrando Arqueo...'
                : occupiedTablesCount !== null && occupiedTablesCount > 0
                  ? `Bloqueado: ${occupiedTablesCount} Mesa(s) Ocupada(s)`
                  : 'Confirmar Arqueo & Cerrar Turno'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Central de Error en Cierre de Turno */}
      <AlertModal
        isOpen={Boolean(error)}
        title="Aviso de Cierre de Turno"
        message={error}
        variant="error"
        onClose={() => setError('')}
      />
    </div>
  );
}

