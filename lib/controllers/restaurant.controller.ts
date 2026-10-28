import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { RestaurantModel } from '@/lib/models/restaurant.model';

export class RestaurantController {
  /**
   * GET /api/restaurants/settings
   */
  static async getSettings() {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    try {
      const restaurant = await RestaurantModel.getById(staff.restaurantId);
      return NextResponse.json({ restaurant });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar ajustes';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  /**
   * PATCH /api/restaurants/settings
   */
  static async updateSettings(request: Request) {
    const staff = await getCurrentStaff();
    if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
      return NextResponse.json({ error: 'No tienes permisos de administrador para cambiar la configuración.' }, { status: 403 });
    }

    try {
      const body = await request.json();
      const updated = await RestaurantModel.updateSettings(staff.restaurantId, body);
      return NextResponse.json({ ok: true, restaurant: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la configuración';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }
}
