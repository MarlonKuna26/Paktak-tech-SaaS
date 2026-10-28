'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  CreditCard,
  UtensilsCrossed,
  ChefHat,
  Calendar,
  KeyRound,
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export type StaffItem = {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'cashier' | 'waiter' | 'kitchen' | 'host';
  active: boolean;
  createdAt: string;
  email: string;
  fullName: string;
  isCurrentUser: boolean;
};

const roleDetails: Record<
  string,
  { label: string; icon: typeof Shield; color: string; bg: string; border: string; desc: string }
> = {
  owner: {
    label: 'Dueño',
    icon: Shield,
    color: 'text-[#181C20]',
    bg: 'bg-[#FEF9EE]',
    border: 'border-[#F6E3B8]',
    desc: 'Dueño fundador. Control irrestricto de sedes y facturación.',
  },
  admin: {
    label: 'Administrador',
    icon: Shield,
    color: 'text-[#181C20]',
    bg: 'bg-[#FEF9EE]',
    border: 'border-[#EAA228]',
    desc: 'Gestiona menú, precios, salón, personal y reportes financieros.',
  },
  cashier: {
    label: 'Cajero & Servicio',
    icon: CreditCard,
    color: 'text-[#181C20]',
    bg: 'bg-[#FAF7F2]',
    border: 'border-[#EAE5DE]',
    desc: 'Atención en salón y mostrador: asigna mesas, toma órdenes y cobra antes o después de servir.',
  },
  waiter: {
    label: 'Cajero & Servicio',
    icon: CreditCard,
    color: 'text-[#181C20]',
    bg: 'bg-[#FAF7F2]',
    border: 'border-[#EAE5DE]',
    desc: 'Atención en salón y mostrador (rol unificado con Cajero).',
  },
  kitchen: {
    label: 'Cocinero / Chef',
    icon: ChefHat,
    color: 'text-[#181C20]',
    bg: 'bg-[#FEF9EE]',
    border: 'border-[#EAA228]',
    desc: 'Pantalla KDS táctil con semáforos de tiempo y despacho de órdenes.',
  },
  host: {
    label: 'Anfitrión (Superusuario)',
    icon: Shield,
    color: 'text-[#EAA228]',
    bg: 'bg-[#161A1E]',
    border: 'border-[#2D3540]',
    desc: 'Superusuario: Control total del sistema, apartados, menú, personal, reportes y ajustes generales.',
  },
};

export function StaffManager() {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<StaffItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'orange' | 'danger';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Form states nuevo empleado
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'cashier' | 'waiter' | 'kitchen' | 'host'>('cashier');

  // Form reset password
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const body = (await res.json()) as { staff: StaffItem[] };
        setStaffList(body.staff || []);
      } else {
        setFeedback({ ok: false, text: 'No se pudo cargar la lista de personal.' });
      }
    } catch {
      setFeedback({ ok: false, text: 'Error de red al consultar el personal.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  // Registrar nuevo empleado
  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || newPassword.length < 6) {
      setFeedback({ ok: false, text: 'Por favor completa todos los campos (contraseña mínimo 6 caracteres).' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const body = (await res.json()) as { error?: string; message?: string };
      setIsSubmitting(false);

      if (!res.ok) {
        setFeedback({ ok: false, text: body.error || 'Error al registrar empleado.' });
        return;
      }

      setFeedback({ ok: true, text: body.message || 'Empleado registrado exitosamente.' });
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('cashier');
      await loadStaff();
    } catch {
      setIsSubmitting(false);
      setFeedback({ ok: false, text: 'Error de red al crear empleado.' });
    }
  }

  // Cambiar rol de empleado
  async function handleRoleChange(staffId: string, newRoleValue: string) {
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRoleValue }),
      });
      if (res.ok) {
        setFeedback({ ok: true, text: 'Rol actualizado correctamente.' });
        setStaffList((prev) =>
          prev.map((s) => (s.id === staffId ? { ...s, role: newRoleValue as StaffItem['role'] } : s)),
        );
      } else {
        const body = (await res.json()) as { error?: string };
        setFeedback({ ok: false, text: body.error || 'No se pudo cambiar el rol.' });
      }
    } catch {
      setFeedback({ ok: false, text: 'Error de red al actualizar rol.' });
    }
  }

  // Activar / Desactivar empleado
  async function handleToggleActive(staffItem: StaffItem) {
    try {
      const nextActive = !staffItem.active;
      const res = await fetch(`/api/staff/${staffItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      });
      if (res.ok) {
        setFeedback({
          ok: true,
          text: `Empleado ${staffItem.fullName} ${nextActive ? 'activado' : 'desactivado'}.`,
        });
        setStaffList((prev) =>
          prev.map((s) => (s.id === staffItem.id ? { ...s, active: nextActive } : s)),
        );
      } else {
        const body = (await res.json()) as { error?: string };
        setFeedback({ ok: false, text: body.error || 'Error al cambiar estado.' });
      }
    } catch {
      setFeedback({ ok: false, text: 'Error de red al actualizar estado.' });
    }
  }

  // Cambiar contraseña de empleado
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!showPasswordModal || resetPasswordVal.length < 6) {
      setFeedback({ ok: false, text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${showPasswordModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPasswordVal }),
      });
      const body = (await res.json()) as { error?: string };
      setIsSubmitting(false);

      if (res.ok) {
        setFeedback({ ok: true, text: `Contraseña actualizada para ${showPasswordModal.fullName}.` });
        setShowPasswordModal(null);
        setResetPasswordVal('');
      } else {
        setFeedback({ ok: false, text: body.error || 'Error al actualizar contraseña.' });
      }
    } catch {
      setIsSubmitting(false);
      setFeedback({ ok: false, text: 'Error de red al actualizar contraseña.' });
    }
  }

  // Eliminar empleado
  function handleDeleteStaff(staffItem: StaffItem) {
    setConfirmModalData({
      isOpen: true,
      title: `Remover a ${staffItem.fullName || staffItem.email}`,
      description: `¿Estás seguro de que deseas remover a ${staffItem.fullName} (${staffItem.email}) del personal del restaurante? Esta acción cancelará su acceso operativo.`,
      confirmText: 'Remover Empleado',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/staff/${staffItem.id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setFeedback({ ok: true, text: `Empleado ${staffItem.fullName} removido del restaurante.` });
            setStaffList((prev) => prev.filter((s) => s.id !== staffItem.id));
          } else {
            const body = (await res.json()) as { error?: string };
            setFeedback({ ok: false, text: body.error || 'Error al remover empleado.' });
          }
        } catch {
          setFeedback({ ok: false, text: 'Error de red al remover empleado.' });
        } finally {
          setConfirmModalData(null);
        }
      },
    });
  }

  // Filtros
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === 'todos' ||
      s.role === roleFilter ||
      (roleFilter === 'cashier' && s.role === 'waiter');
    return matchesSearch && matchesRole;
  });

  const countByRole = {
    total: staffList.length,
    active: staffList.filter((s) => s.active).length,
    hosts: staffList.filter((s) => s.role === 'host').length,
    cashiers: staffList.filter((s) => s.role === 'cashier' || s.role === 'waiter').length,
    kitchen: staffList.filter((s) => s.role === 'kitchen').length,
    admins: staffList.filter((s) => ['admin', 'owner'].includes(s.role)).length,
  };

  return (
    <div className="space-y-6 font-sans text-[#181C20]">
      {/* Alert Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold shadow-xs transition-all ${
            feedback.ok
              ? 'border border-emerald-500/20 bg-emerald-50 text-emerald-800'
              : 'border border-red-500/20 bg-red-50 text-red-800'
          }`}
        >
          {feedback.ok ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C95A3]">Total Personal</p>
          <p className="mt-1 text-2xl font-black text-[#181C20]">{countByRole.total}</p>
          <p className="mt-0.5 text-[11px] font-bold text-[#1E7E34]">{countByRole.active} activos</p>
        </div>
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C95A3]">Anfitriones</p>
          <p className="mt-1 text-2xl font-black text-[#EAA228]">{countByRole.hosts}</p>
          <p className="mt-0.5 text-[11px] text-[#666E7A]">Superusuario total</p>
        </div>
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C95A3]">Cajeros & Servicio</p>
          <p className="mt-1 text-2xl font-black text-[#181C20]">{countByRole.cashiers}</p>
          <p className="mt-0.5 text-[11px] text-[#666E7A]">Mesas, orden y cobro</p>
        </div>
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C95A3]">Cocina / Barra</p>
          <p className="mt-1 text-2xl font-black text-[#EAA228]">{countByRole.kitchen}</p>
          <p className="mt-0.5 text-[11px] text-[#666E7A]">Pantalla KDS</p>
        </div>
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C95A3]">Administradores</p>
          <p className="mt-1 text-2xl font-black text-[#181C20]">{countByRole.admins}</p>
          <p className="mt-0.5 text-[11px] text-[#666E7A]">Gestión y menú</p>
        </div>
      </div>

      {/* Control Bar: Search, Filter & Add Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C95A3]" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#D9D3C7] bg-white pl-10 pr-4 text-xs font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228] shadow-xs"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-xs font-bold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228] shadow-xs"
          >
            <option value="todos">Todos los roles</option>
            <option value="host">Anfitrión (Superusuario)</option>
            <option value="cashier">Cajero & Servicio</option>
            <option value="kitchen">Cocinero / Chef</option>
            <option value="admin">Administrador</option>
          </select>

          <button
            onClick={() => void loadStaff()}
            disabled={loading}
            className="h-10 w-10 shrink-0 rounded-xl border border-[#D9D3C7] bg-white flex items-center justify-center text-[#666E7A] hover:bg-[#FAF7F2] transition-colors shadow-xs cursor-pointer"
            title="Recargar personal"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#EAA228]' : ''}`} />
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#EAA228] hover:bg-[#D99318] px-5 text-xs font-black text-[#181C20] shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar Empleado</span>
        </button>
      </div>

      {/* Staff Members List */}
      <div className="rounded-2xl border border-[#EAE5DE] bg-white shadow-xs overflow-hidden">
        {loading && !staffList.length ? (
          <div className="p-12 text-center text-xs text-[#8C95A3]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#EAA228] mb-2" />
            Cargando el equipo del restaurante...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-[#666E7A]">
            <Users className="w-8 h-8 mx-auto text-[#8C95A3] mb-2 opacity-50" />
            <p className="text-sm font-bold text-[#181C20]">No se encontraron empleados con los filtros aplicados.</p>
            <p className="mt-1 text-xs text-[#8C95A3]">Puedes registrar un nuevo mesero, cajero o cocinero con el botón superior.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#EAE5DE]">
            {filteredStaff.map((staffItem) => {
              const details = roleDetails[staffItem.role] || roleDetails.waiter;
              const Icon = details.icon;
              const initials = staffItem.fullName
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join('');

              return (
                <div
                  key={staffItem.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors hover:bg-[#FAF7F2]/60"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-[#FAF7F2] border border-[#EAE5DE] flex items-center justify-center font-black text-xs text-[#181C20] shadow-xs">
                      {initials || 'EM'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-sm text-[#181C20] truncate">
                          {staffItem.fullName}
                        </p>
                        {staffItem.isCurrentUser && (
                          <span className="rounded-full bg-[#181C20] text-white px-2 py-0.5 text-[10px] font-black">
                            Tú
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${details.bg} ${details.color} ${details.border}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{details.label}</span>
                        </span>
                      </div>

                      <p className="text-xs text-[#666E7A] mt-0.5">{staffItem.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:self-center">
                    {/* Role Selector dropdown */}
                    {staffItem.role !== 'owner' && (
                      <select
                        value={staffItem.role}
                        onChange={(e) => void handleRoleChange(staffItem.id, e.target.value)}
                        className="h-8 rounded-lg border border-[#D9D3C7] bg-[#FAF7F2] px-3 text-[11px] font-bold text-[#181C20] focus:outline-none focus:ring-1 focus:ring-[#EAA228]"
                      >
                        <option value="host">Anfitrión (Superusuario)</option>
                        <option value="cashier">Cajero & Servicio</option>
                        <option value="kitchen">Cocinero / Chef</option>
                        <option value="admin">Administrador</option>
                      </select>
                    )}

                    {/* Active toggle button */}
                    {staffItem.role !== 'owner' && !staffItem.isCurrentUser && (
                      <button
                        onClick={() => void handleToggleActive(staffItem)}
                        className={`h-8 rounded-lg px-3 text-[11px] font-black transition-colors ${
                          staffItem.active
                            ? 'bg-[#EBF7EE] text-[#1E7E34] hover:bg-[#DDF2E2]'
                            : 'bg-[#FAF7F2] text-[#8C95A3] hover:bg-[#EAE5DE]'
                        }`}
                      >
                        {staffItem.active ? 'Activo' : 'Desactivado'}
                      </button>
                    )}

                    {/* Password reset button */}
                    <button
                      onClick={() => setShowPasswordModal(staffItem)}
                      title="Cambiar contraseña del empleado"
                      className="h-8 w-8 rounded-lg border border-[#D9D3C7] bg-white flex items-center justify-center text-[#666E7A] hover:bg-[#FAF7F2] transition-colors shadow-xs cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    {staffItem.role !== 'owner' && !staffItem.isCurrentUser && (
                      <button
                        onClick={() => void handleDeleteStaff(staffItem)}
                        title="Remover del personal"
                        className="h-8 w-8 rounded-lg border border-red-200 bg-white flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors shadow-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Registrar Empleado */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-[28px] border border-[#EAE5DE] bg-white p-6 sm:p-7 shadow-2xl">
            <h3 className="text-xl font-black text-[#181C20]">Registrar Nuevo Empleado</h3>
            <p className="mt-1 text-xs text-[#666E7A]">
              Crea un acceso para tu mesero, cajero, cocinero o administrador del restaurante.
            </p>

            <form onSubmit={(e) => void handleCreateStaff(e)} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#181C20] mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-xs font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#181C20] mb-1">
                  Correo Electrónico (para inicio de sesión) *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Ej. carlos.mesero@mirestaurante.com"
                  className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-xs font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#181C20] mb-1">
                  Contraseña Temporal * (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ej. Paktak2026!"
                  className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-xs font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#181C20] mb-2">
                  Rol y Permisos Operativos *
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(['host', 'cashier', 'kitchen', 'admin'] as const).map((rKey) => {
                    const r = roleDetails[rKey];
                    const Icon = r.icon;
                    const isSelected = newRole === rKey;

                    return (
                      <button
                        type="button"
                        key={rKey}
                        onClick={() => setNewRole(rKey)}
                        className={`text-left p-3 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'border-2 border-[#EAA228] bg-[#FEF9EE] text-[#181C20]'
                            : 'border-[#EAE5DE] bg-[#FAF7F2] text-[#666E7A] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-black text-[#181C20]">
                          <Icon className="w-4 h-4 text-[#EAA228]" />
                          <span>{r.label}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#666E7A] leading-snug">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE5DE]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-11 rounded-xl border border-[#D9D3C7] px-5 text-xs font-bold text-[#666E7A] hover:bg-[#FAF7F2] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl bg-[#EAA228] hover:bg-[#D99318] px-6 text-xs font-black text-[#181C20] shadow-sm transition-all"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cambiar Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-[#EAE5DE] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-start justify-between pb-3 border-b border-[#EAE5DE]">
              <div>
                <h3 className="text-lg font-black text-[#181C20]">
                  Cambiar Contraseña
                </h3>
                <p className="mt-0.5 text-xs text-[#666E7A]">
                  Nueva contraseña para <strong>{showPasswordModal.fullName}</strong> ({showPasswordModal.email}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(null)}
                className="text-[#8C95A3] hover:text-[#181C20] p-1 rounded-full transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleResetPassword(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#666E7A] mb-1">
                  Nueva Contraseña * (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Ingresa la nueva clave..."
                  className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-xs font-semibold text-[#181C20] focus:border-[#EAA228] focus:ring-2 focus:ring-[#EAA228] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DE]">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="h-10 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-bold text-[#666E7A] hover:bg-[#FAF7F2] shadow-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-xl bg-[#EAA228] hover:bg-[#D99318] px-5 text-xs font-black text-[#181C20] shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Actualizar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Genérico Suave */}
      {confirmModalData && (
        <ConfirmModal
          isOpen={confirmModalData.isOpen}
          title={confirmModalData.title}
          description={confirmModalData.description}
          confirmText={confirmModalData.confirmText}
          variant={confirmModalData.variant}
          onConfirm={confirmModalData.onConfirm}
          onClose={() => setConfirmModalData(null)}
        />
      )}
    </div>
  );
}
