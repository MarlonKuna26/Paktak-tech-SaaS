import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UpdateRestaurantInput = {
  name?: string;
  currency?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
};

export class RestaurantModel {
  /**
   * Obtiene la configuración de un restaurante
   */
  static async getById(restaurantId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, timezone, currency, settings, plan, status, trial_ends_at')
      .eq('id', restaurantId)
      .single();

    if (error || !data) throw new Error('No se encontró el restaurante.');
    return data;
  }

  /**
   * Actualiza la configuración, fusionando campos de settings jsonb
   */
  static async updateSettings(restaurantId: string, input: UpdateRestaurantInput) {
    const supabase = await createSupabaseServerClient();

    // Obtener configuración actual
    const { data: current } = await supabase
      .from('restaurants')
      .select('settings')
      .eq('id', restaurantId)
      .single();

    const mergedSettings = {
      ...(current?.settings || {}),
      ...(input.settings || {}),
    };

    const updatePayload: Record<string, unknown> = {
      settings: mergedSettings,
    };

    if (input.name && typeof input.name === 'string' && input.name.trim()) {
      updatePayload.name = input.name.trim();
    }
    if (input.currency && typeof input.currency === 'string') {
      updatePayload.currency = input.currency.trim();
    }
    if (input.timezone && typeof input.timezone === 'string') {
      updatePayload.timezone = input.timezone.trim();
    }

    const { data: updated, error } = await supabase
      .from('restaurants')
      .update(updatePayload)
      .eq('id', restaurantId)
      .select('id, name, slug, timezone, currency, settings, plan, status')
      .single();

    if (error) throw new Error(error.message);
    return updated;
  }
}
