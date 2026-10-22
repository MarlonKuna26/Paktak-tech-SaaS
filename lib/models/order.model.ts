import { createSupabaseServerClient } from '@/lib/supabase/server';

export class OrderModel {
  /**
   * Ejecuta el cierre y cobro de una comanda de salón mediante checkout_table_order RPC
   */
  static async checkoutTableOrder(
    orderId: string,
    paymentMethod: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro',
    tipCents = 0,
    paidCents = 0,
    releaseTable = true,
  ) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('checkout_table_order', {
      p_order_id: orderId,
      p_payment_method: paymentMethod,
      p_tip_cents: tipCents,
      p_paid_cents: paidCents,
      p_release_table: releaseTable,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Registra el pago de un pedido público / takeout / paleta mediante register_public_order_payment RPC
   */
  static async registerPublicOrderPayment(
    orderId: string,
    paymentMethod: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro',
    paidAmountCents: number,
    tokenNumber?: string | null,
    serviceType: 'paleta_madera' | 'mesa_fija' | 'para_llevar' = 'paleta_madera',
  ) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('register_public_order_payment', {
      target_order_id: orderId,
      pay_method: paymentMethod,
      paid_cents: paidAmountCents,
      token_number: tokenNumber ?? null,
      target_service_type: serviceType,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Cambia el estado de preparación de ítems de comanda en KDS mediante kds_set_item_status RPC
   */
  static async updateKdsItemStatus(
    itemIds: string[],
    status: 'pendiente' | 'preparando' | 'listo' | 'entregado',
  ) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('kds_set_item_status', {
      p_item_ids: itemIds,
      p_status: status,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Marca todos los ítems de una orden como servidos en mesa
   */
  static async serveOrderItems(orderId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('serve_order_items', {
      p_order_id: orderId,
    });

    if (error) throw new Error(error.message);
    return data;
  }
}

