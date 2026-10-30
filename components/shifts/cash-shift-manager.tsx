'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Printer,
  Calendar,
  DollarSign,
  CreditCard,
  User,
  ArrowRight,
  ShieldCheck,
  Check,
  HelpCircle,
} from 'lucide-react';
import type { CashShift, ShiftLiveMetrics } from '@/lib/models/cash-shift.model';
import { OpenShiftModal, CloseShiftModal } from './cash-shift-modal';
import { AlertModal } from '@/components/ui/alert-modal';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CashShiftManager({
  restaurantId,
  userRole,
}: {
  restaurantId: string;
  userRole: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);
  const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<ShiftLiveMetrics | null>(null);
  const [shiftsHistory, setShiftsHistory] = useState<Array<CashShift & { liveMetrics?: ShiftLiveMetrics }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [defaultInitialCash, setDefaultInitialCash] = useState<number>(50);

  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/shifts?date=${selectedDate}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'No se pudieron cargar los turnos.');
      }
      const data = await res.json();
      setCurrentShift(data.currentShift || null);
      setLiveMetrics(data.currentMetrics || null);
      setShiftsHistory(data.shifts || []);
      if (data.defaultInitialCashDollars !== undefined) setDefaultInitialCash(data.defaultInitialCashDollars);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Modales de Apertura y Cierre */}
      <OpenShiftModal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
        initialCashDefault={defaultInitialCash}
        onShiftOpened={() => void loadData()}
      />

      <CloseShiftModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        shift={currentShift}
        metrics={liveMetrics}
        onShiftClosed={() => void loadData()}
      />

      {/* 1. SECCIÓN DE TURNO EN CURSO */}
      <div className="rounded-3xl border border-[#EAE5DE] bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DE]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF9EE] text-[#EAA228] border border-[#F6E3B8]">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-[#181C20]">Turno de Caja en Vivo</h2>
                {currentShift ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Turno Abierto
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-[#FAF7F2] border border-[#EAE5DE] px-2.5 py-0.5 text-[11px] font-bold text-[#666E7A]">
                    Caja Cerrada
                  </span>
                )}
              </div>
              <p className="text-xs text-[#666E7A] mt-0.5">
                Control de gaveta, fondo inicial y arqueo de turno para cajeras y administrador
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              className="h-10 px-3.5 rounded-xl border border-[#EAE5DE] bg-[#FAF7F2] text-xs font-bold text-[#181C20] hover:bg-[#EAE5DE] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#EAA228]' : ''}`} />
              <span>Actualizar</span>
            </button>

            {currentShift ? (
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(true)}
                className="h-10 px-4 rounded-xl bg-[#181C20] hover:bg-black text-xs font-black text-white uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <ShieldCheck className="h-4 w-4 text-[#EAA228]" />
                <span>Hacer Arqueo & Cerrar Turno</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsOpenModalOpen(true)}
                className="h-10 px-4 rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-xs font-black text-[#181C20] uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Abrir Turno de Caja</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Central de Alerta de Turnos */}
        <AlertModal
          isOpen={Boolean(error)}
          title="Aviso de Turnos de Caja"
          message={error}
          variant="error"
          onClose={() => setError('')}
        />

        {/* Detalle del Turno Activo */}
        {currentShift ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-4.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#8C95A3]">
                Responsable & Horario
              </span>
              <p className="mt-1 text-base font-black text-[#181C20]">{currentShift.cashier_name}</p>
              <p className="text-xs font-semibold text-[#EAA228]">
                {currentShift.shift_name} · Desde {new Date(currentShift.opened_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-4.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#8C95A3]">
                Fondo Inicial (Gaveta)
              </span>
              <p className="mt-1 text-2xl font-black text-[#181C20]">
                ${(currentShift.initial_cash_cents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-[#666E7A]">Dinero base para dar cambio</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                Cobros en Efectivo (Turno)
              </span>
              <p className="mt-1 text-2xl font-black text-emerald-700">
                +${((liveMetrics?.cashSalesCents ?? 0) / 100).toFixed(2)}
              </p>
              <p className="text-xs text-emerald-800/80">Ventas en mostrador y salón</p>
            </div>

            <div className="rounded-2xl border-2 border-[#EAA228] bg-[#FEF9EE] p-4.5 shadow-xs">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#8F5E00]">
                Efectivo Esperado en Gaveta
              </span>
              <p className="mt-1 text-2xl font-black text-[#8F5E00]">
                ${((liveMetrics?.expectedCashCents ?? currentShift.initial_cash_cents) / 100).toFixed(2)}
              </p>
              <p className="text-[11px] text-[#8F5E00]/80">Fondo inicial + Efectivo cobrado</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#D9D3C7] bg-[#FAF7F2] p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#EAE5DE] flex items-center justify-center text-[#8C95A3] mx-auto">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-[#181C20]">No hay un turno de caja abierto en este momento</p>
              <p className="text-xs text-[#666E7A] max-w-md mx-auto mt-0.5">
                Para comenzar a registrar ventas y controlar el dinero de la gaveta, la cajera debe abrir el turno indicando el fondo inicial.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpenModalOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#EAA228] hover:bg-[#D99318] px-5 text-xs font-black text-[#181C20] uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Abrir Turno de Caja Ahora</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. HISTORIAL DIARIO DE TURNOS (ARQUEOS DEL DÍA PARA EL ADMINISTRADOR) */}
      <div className="rounded-3xl border border-[#EAE5DE] bg-white p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[#181C20]">Control Diario de Turnos & Arqueos</h3>
            <p className="text-xs text-[#666E7A]">
              Revisa el cuadre de caja de cada cajera (Turno Mañana vs Turno Tarde/Noche)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#8C95A3]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 rounded-xl border border-[#D9D3C7] bg-[#FAF7F2] px-3 text-xs font-bold text-[#181C20] outline-none focus:ring-2 focus:ring-[#EAA228]"
            />
          </div>
        </div>

        {shiftsHistory.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8C95A3]">
            No se registraron turnos en la fecha seleccionada ({selectedDate}).
          </div>
        ) : (
          <div className="space-y-4">
            {shiftsHistory.map((shift, idx) => {
              const isClosed = shift.status === 'cerrado';
              const openTime = new Date(shift.opened_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
              const closeTime = shift.closed_at
                ? new Date(shift.closed_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
                : 'En curso';

              const diff = shift.difference_cents ?? 0;
              const isBalanced = diff === 0;
              const isSurplus = diff > 0;
              const isShortage = diff < 0;

              return (
                <div
                  key={shift.id}
                  className="rounded-2xl border border-[#EAE5DE] bg-white p-5 hover:border-[#EAA228] transition-all space-y-4 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#EAE5DE]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF7F2] text-[#181C20] font-black text-sm border border-[#EAE5DE]">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-[#181C20]">{shift.shift_name}</h4>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              isClosed
                                ? 'bg-[#FAF7F2] text-[#666E7A] border border-[#EAE5DE]'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isClosed ? 'Cerrado' : 'En Curso'}
                          </span>
                        </div>
                        <p className="text-xs text-[#666E7A]">
                          Cajera: <strong>{shift.cashier_name}</strong> · {openTime} a {closeTime}
                        </p>
                      </div>
                    </div>

                    {isClosed && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                            isBalanced
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isSurplus
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          {isBalanced ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Caja Cuadrada ($0.00)</span>
                            </>
                          ) : isSurplus ? (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5 text-sky-600" />
                              <span>Sobrante +${(diff / 100).toFixed(2)}</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                              <span>Faltante -${Math.abs(diff / 100).toFixed(2)}</span>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cifras del Turno */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#8C95A3]">Fondo Inicial</span>
                      <p className="mt-0.5 font-mono font-bold text-[#181C20]">${(shift.initial_cash_cents / 100).toFixed(2)}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#8C95A3]">Ventas Efectivo</span>
                      <p className="mt-0.5 font-mono font-bold text-emerald-700">
                        +${((isClosed ? shift.calculated_cash_cents : shift.liveMetrics?.cashSalesCents ?? 0) / 100).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#8C95A3]">Ventas Digitales</span>
                      <p className="mt-0.5 font-mono font-bold text-sky-700">
                        ${((isClosed ? shift.calculated_digital_cents : shift.liveMetrics?.digitalSalesCents ?? 0) / 100).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#8C95A3]">Efectivo Esperado</span>
                      <p className="mt-0.5 font-mono font-bold text-[#181C20]">
                        ${((isClosed ? shift.expected_cash_cents : (shift.liveMetrics?.expectedCashCents ?? shift.initial_cash_cents)) / 100).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#8C95A3]">Fondo Dejado Sig. Turno</span>
                      <p className="mt-0.5 font-mono font-bold text-[#EAA228]">
                        ${(shift.left_for_next_shift_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {shift.notes && (
                    <p className="text-xs text-[#666E7A] bg-[#FAF7F2] p-2.5 rounded-xl italic">
                      Nota de entrega: {shift.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

