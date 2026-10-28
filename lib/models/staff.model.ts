import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type StaffRole = 'owner' | 'admin' | 'cashier' | 'waiter' | 'kitchen' | 'host';

export type StaffEntity = {
  id: string;
  userId: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
  email: string;
  fullName: string;
  isCurrentUser: boolean;
};

export type CreateStaffInput = {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'cashier' | 'waiter' | 'kitchen' | 'host';
};

export type UpdateStaffInput = {
  role?: StaffRole;
  active?: boolean;
  newPassword?: string;
};

export class StaffModel {
  /**
   * Obtiene todos los empleados de un restaurante cruzando staff_members y auth.users
   */
  static async listByRestaurant(restaurantId: string, currentUserId: string): Promise<StaffEntity[]> {
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    const { data: staffMembers, error: staffError } = await supabase
      .from('staff_members')
      .select('id, user_id, restaurant_id, role, active, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true });

    if (staffError) throw new Error(staffError.message);

    const userMap = new Map();
    if (staffMembers && staffMembers.length > 0) {
      const userFetches = await Promise.all(
        staffMembers.map((sm) => adminClient.auth.admin.getUserById(sm.user_id))
      );
      for (const res of userFetches) {
        if (res.data?.user) {
          userMap.set(res.data.user.id, res.data.user);
        }
      }
    }

    return (staffMembers || []).map((sm) => {
      const authUser = userMap.get(sm.user_id);
      const metaName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name;
      return {
        id: sm.id,
        userId: sm.user_id,
        role: sm.role,
        active: sm.active,
        createdAt: sm.created_at,
        email: authUser?.email || 'Sin correo',
        fullName: metaName || authUser?.email?.split('@')[0] || 'Personal',
        isCurrentUser: sm.user_id === currentUserId,
      };
    });
  }

  /**
   * Registra un nuevo empleado creando su usuario en Auth si no existe
   */
  static async create(restaurantId: string, input: CreateStaffInput) {
    const adminClient = createSupabaseAdminClient();
    const { fullName, email, password, role } = input;

    let authUser: { id: string; email?: string } | null = null;

    const { data: createdUser, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (!createAuthError && createdUser?.user) {
      authUser = createdUser.user;
    } else {
      // Si el correo ya existe en auth, lo buscamos para vincularlo a este restaurante
      const { data: listData } = await adminClient.auth.admin.listUsers();
      authUser = listData?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
      if (!authUser) {
        throw new Error(createAuthError?.message || 'No se pudo generar el usuario en Auth.');
      }
    }

    if (!authUser) throw new Error('No se pudo generar el usuario en Auth.');

    const { data: existingMembership } = await adminClient
      .from('staff_members')
      .select('id, role')
      .eq('user_id', authUser.id)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (existingMembership) {
      throw new Error(`El usuario ${email} ya está registrado con el rol de ${existingMembership.role}.`);
    }

    const { data: newStaff, error: insertError } = await adminClient
      .from('staff_members')
      .insert({
        user_id: authUser.id,
        restaurant_id: restaurantId,
        role,
        active: true,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return {
      id: newStaff.id,
      userId: newStaff.user_id,
      role: newStaff.role,
      active: newStaff.active,
      email: authUser.email,
      fullName,
    };
  }

  /**
   * Actualiza el rol, estado o contraseña de un empleado
   */
  static async update(restaurantId: string, staffId: string, input: UpdateStaffInput, currentUserId: string) {
    const adminClient = createSupabaseAdminClient();

    const { data: targetStaff, error: findError } = await adminClient
      .from('staff_members')
      .select('id, user_id, role, restaurant_id')
      .eq('id', staffId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (findError || !targetStaff) throw new Error('Empleado no encontrado.');

    if (targetStaff.user_id === currentUserId && input.active === false) {
      throw new Error('No puedes desactivar tu propia cuenta de administrador.');
    }

    const updates: Record<string, unknown> = {};
    if (input.role !== undefined) updates.role = input.role;
    if (input.active !== undefined) updates.active = input.active;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await adminClient
        .from('staff_members')
        .update(updates)
        .eq('id', staffId);

      if (updateError) throw new Error(updateError.message);
    }

    if (input.newPassword) {
      const { error: pwError } = await adminClient.auth.admin.updateUserById(targetStaff.user_id, {
        password: input.newPassword,
      });
      if (pwError) throw new Error(`Error al actualizar contraseña: ${pwError.message}`);
    }

    return true;
  }

  /**
   * Remueve a un empleado del restaurante
   */
  static async remove(restaurantId: string, staffId: string, currentUserId: string) {
    const adminClient = createSupabaseAdminClient();

    const { data: targetStaff, error: findError } = await adminClient
      .from('staff_members')
      .select('id, user_id, role, restaurant_id')
      .eq('id', staffId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (findError || !targetStaff) throw new Error('Empleado no encontrado.');
    if (targetStaff.user_id === currentUserId) {
      throw new Error('No puedes eliminar tu propio usuario de administrador.');
    }

    const { error: deleteError } = await adminClient
      .from('staff_members')
      .delete()
      .eq('id', staffId);

    if (deleteError) throw new Error(deleteError.message);

    return true;
  }
}
