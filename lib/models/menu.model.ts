import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MenuCategory, MenuProduct } from '@/lib/menu/types';

export class MenuModel {
  /**
   * Obtiene las categorías activas y ordenadas
   */
  static async listCategories(restaurantId: string): Promise<MenuCategory[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, sort_order, active')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as MenuCategory[];
  }

  /**
   * Obtiene los productos del restaurante
   */
  static async listProducts(restaurantId: string): Promise<MenuProduct[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('products')
      .select('id, category_id, name, description, price_cents, active, station')
      .eq('restaurant_id', restaurantId)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as MenuProduct[];
  }
}
