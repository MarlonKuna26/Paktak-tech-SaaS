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
} from 'lucide-react';

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
    color: 'text-amber-800 dark:text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    desc: 'Dueño fundador. Control irrestricto de sedes y facturación.',
  },
  admin: {
    label: 'Administrador',
    icon: Shield,
    color: 'text-purple-800 dark:text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    desc: 'Gestiona menú, precios, salón, personal y reportes financieros.',
  },
  cashier: {
    label: 'Cajero',
    icon: CreditCard,
    color: 'text-emerald-800 dark:text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    desc: 'Cobro de comandas de salón y web, arqueo y cierre de caja diario.',
  },
  waiter: {
    label: 'Mesero',
    icon: UtensilsCrossed,
    color: 'text-blue-800 dark:text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    desc: 'Comandero móvil offline-first, notas de platos y cobro en mesa.',
  },
  kitchen: {
    label: 'Cocinero / Chef',
    icon: ChefHat,
    color: 'text-rose-800 dark:text-rose-300',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    desc: 'Pantalla KDS táctil con semáforos de tiempo y despacho de comandas.',
  },
  host: {
    label: 'Anfitrión / Host',
    icon: Calendar,
    color: 'text-cyan-800 dark:text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    desc: 'Recepción y asignación de mesas en salón y libro de reservas web.',
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

  // Form states nuevo empleado
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'cashier' | 'waiter' | 'kitchen' | 'host'>('waiter');

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
      setNewRole('waiter');
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
  async function handleDeleteStaff(staffItem: StaffItem) {
    if (
      !confirm(
        `¿Estás seguro de remover a ${staffItem.fullName} (${staffItem.email}) del personal del restaurante?`,
      )
    ) {
      return;
    }

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
    }
  }

  // Filtros
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'todos' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const countByRole = {
    total: staffList.length,
    active: staffList.filter((s) => s.active).length,
    waiters: staffList.filter((s) => s.role === 'waiter').length,
    kitchen: staffList.filter((s) => s.role === 'kitchen').length,
    cashiers: staffList.filter((s) => s.role === 'cashier').length,
    admins: staffList.filter((s) => ['admin', 'owner'].includes(s.role)).length,
  };

  return (
    <div className="space-y-6">
      {/* Alert Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold shadow-xs transition-all ${
            feedback.ok
              ? 'border border-emerald-500/20 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border border-rose-500/20 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          {feedback.ok ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Personal</p>
          <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">{countByRole.total}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">{countByRole.active} activos</p>
        </div>
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Meseros</p>
          <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{countByRole.waiters}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Comandero móvil</p>
        </div>
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cocina / Barra</p>
          <p className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">{countByRole.kitchen}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Pantalla KDS</p>
        </div>
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cajeros</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{countByRole.cashiers}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Cobro y caja</p>
        </div>
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Administradores</p>
          <p className="mt-1 text-2xl font-black text-purple-600 dark:text-purple-400">{countByRole.admins}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Gestión total</p>
        </div>
      </div>

      {/* Control Bar: Search, Filter & Add Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-2xs"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none shadow-2xs"
          >
            <option value="todos">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="cashier">Cajero</option>
            <option value="waiter">Mesero</option>
            <option value="kitchen">Cocinero</option>
            <option value="host">Anfitrión</option>
          </select>

          <button
            onClick={() => void loadStaff()}
            disabled={loading}
            className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            title="Recargar personal"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-5 text-xs font-bold text-zinc-950 shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar Empleado</span>
        </button>
      </div>

      {/* Staff Members List */}
      <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
        {loading && !staffList.length ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
            Cargando el equipo del restaurante...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto text-zinc-400 mb-2 opacity-50" />
            <p className="text-sm font-semibold">No se encontraron empleados con los filtros aplicados.</p>
            <p className="mt-1 text-xs">Puedes registrar un nuevo mesero, cajero o cocinero con el botón superior.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 shrink-0 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300 shadow-2xs">
                      {initials || 'EM'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {staffItem.fullName}
                        </p>
                        {staffItem.isCurrentUser && (
                          <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                            Tú
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${details.bg} ${details.color} ${details.border}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{details.label}</span>
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{staffItem.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:self-center">
                    {/* Role Selector dropdown */}
                    {staffItem.role !== 'owner' && (
                      <select
                        value={staffItem.role}
                        onChange={(e) => void handleRoleChange(staffItem.id, e.target.value)}
                        className="h-8 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none"
                      >
                        <option value="admin">Administrador</option>
                        <option value="cashier">Cajero</option>
                        <option value="waiter">Mesero</option>
                        <option value="kitchen">Cocinero</option>
                        <option value="host">Anfitrión</option>
                      </select>
                    )}

                    {/* Active toggle button */}
                    {staffItem.role !== 'owner' && !staffItem.isCurrentUser && (
                      <button
                        onClick={() => void handleToggleActive(staffItem)}
                        className={`h-8 rounded-full px-3 text-[11px] font-bold transition-colors ${
                          staffItem.active
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {staffItem.active ? 'Activo' : 'Desactivado'}
                      </button>
                    )}

                    {/* Password reset button */}
                    <button
                      onClick={() => setShowPasswordModal(staffItem)}
                      title="Cambiar contraseña del empleado"
                      className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    {staffItem.role !== 'owner' && !staffItem.isCurrentUser && (
                      <button
                        onClick={() => void handleDeleteStaff(staffItem)}
                        title="Remover del personal"
                        className="h-8 w-8 rounded-full border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-zinc-800 flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shadow-2xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Registrar Nuevo Empleado</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Crea un acceso para tu mesero, cajero, cocinero o administrador del restaurante.
            </p>

            <form onSubmit={(e) => void handleCreateStaff(e)} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Correo Electrónico (para inicio de sesión) *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Ej. carlos.mesero@mirestaurante.com"
                  className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Contraseña Temporal * (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ej. Mesero123!"
                  className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Rol y Permisos Operativos *
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(['waiter', 'kitchen', 'cashier', 'host', 'admin'] as const).map((rKey) => {
                    const r = roleDetails[rKey];
                    const Icon = r.icon;
                    const isSelected = newRole === rKey;

                    return (
                      <button
                        type="button"
                        key={rKey}
                        onClick={() => setNewRole(rKey)}
                        className={`text-left p-3 rounded-2xl border text-xs transition-all ${
                          isSelected
                            ? 'border-[#f3a806] bg-[#f3a806]/10 text-zinc-950 dark:text-zinc-100 ring-2 ring-[#f3a806]/30'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold">
                          <Icon className="w-4 h-4 text-primary" />
                          <span>{r.label}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 rounded-full border border-zinc-200 dark:border-zinc-700 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-5 text-xs font-bold text-zinc-950 shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Cambiar Contraseña
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Nueva contraseña para <strong>{showPasswordModal.fullName}</strong> ({showPasswordModal.email}).
            </p>

            <form onSubmit={(e) => void handleResetPassword(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nueva Contraseña * (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Ingresa la nueva clave..."
                  className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="h-9 rounded-full border border-zinc-200 dark:border-zinc-700 px-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-4 text-xs font-bold text-zinc-950 shadow-xs"
                >
                  {isSubmitting ? 'Guardando...' : 'Actualizar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
