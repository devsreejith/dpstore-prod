import { QueryOptionsType } from "@framework/types";
import http from "@framework/utils/http";
import { useQuery } from "@tanstack/react-query";

export const fetchOrders = async () => {
  const fields = "id,display_id,created_at,email,total,subtotal,tax_total,shipping_total,discount_total,currency_code,payment_status,fulfillment_status,status,canceled_at,updated_at,metadata," +
    "items.id,items.title,items.quantity,items.unit_price,items.thumbnail,items.variant.id,items.variant.product.thumbnail," +
    "payment_collections.id,payment_collections.status,payment_collections.captured_amount,payment_collections.amount,payment_collections.authorized_amount,payment_collections.payment_sessions.id,payment_collections.payment_sessions.provider_id,payment_collections.payment_sessions.status,payment_collections.payment_sessions.data," +
    "payment_collections.payments.id,payment_collections.payments.provider_id,payment_collections.payments.data";

  try {
    const { data } = await http.get(`/store/orders`, {
      params: { fields }
    });
    const orders = (data?.orders ?? []) as any[];
    orders.sort((a, b) => {
      const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
    return { orders, count: data?.count ?? 0 };
  } catch (e: any) {
    const status = e?.response?.status;
    const msg = String(e?.response?.data?.message ?? e?.message ?? "");
    if (status === 400 && msg.toLowerCase().includes("unrecognized fields")) {
      const { data } = await http.get(`/store/orders`);
      return { orders: (data?.orders ?? []) as any[], count: data?.count ?? 0 };
    }
    throw e;
  }
};
export const useOrdersQuery = (options: QueryOptionsType) => {
  return useQuery<{ orders: any[]; count: number }, Error>({
    queryKey: ["store.orders", options],
    queryFn: fetchOrders,
  });
};
