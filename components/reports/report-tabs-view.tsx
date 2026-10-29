'use client';

import { useState } from 'react';
import { Wallet, BarChart3, TrendingUp, Calendar, ShieldCheck } from 'lucide-react';
import { CashShiftManager } from '@/components/shifts/cash-shift-manager';
import { DailyReportView } from './daily-report-view';
import type { CurrentStaff } from '@/lib/auth/get-current-staff';

export function ReportTabsView({ staff }: { staff: CurrentStaff }) {
  const [activeTab, setActiveTab] = useState<'turnos' | 'financiero'>('turnos');

  return (
    <div className="space-y-6">
      {/* Switch de Pestañas de Reportes */}
      <div className="rounded-2xl border border-[#EAE5DE] bg-white p-2 sm:p-2.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF7F2] border border-[#EAE5DE]">
            <button
              type="button"
              onClick={() => setActiveTab('turnos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'turnos'
                  ? 'bg-[#EAA228] text-[#181C20] shadow-xs'
                  : 'text-[#666E7A] hover:text-[#181C20]'
              }`}
            >
              <Wallet className="w-4 h-4 text-[#181C20]" />
              <span>1. Cuadre de Caja & Turnos (Cajeras)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('financiero')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'financiero'
                  ? 'bg-[#EAA228] text-[#181C20] shadow-xs'
                  : 'text-[#666E7A] hover:text-[#181C20]'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#181C20]" />
              <span>2. Reporte Financiero & Rentabilidad</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#666E7A] px-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[11px] font-bold">
              {activeTab === 'turnos'
                ? 'Auditoría de gaveta, arqueo por turno y fondos iniciales'
                : 'Márgenes de ganancia, costos operativos y canales'}
            </span>
          </div>
        </div>
      </div>

      {activeTab === 'turnos' ? (
        <CashShiftManager restaurantId={staff.restaurantId} userRole={staff.role} />
      ) : (
        <DailyReportView restaurantName={staff.restaurantName} />
      )}
    </div>
  );
}

