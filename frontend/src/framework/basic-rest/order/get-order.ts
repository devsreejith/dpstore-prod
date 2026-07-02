import http from "@framework/utils/http";
import { useQuery } from "@tanstack/react-query";

const orderFields = "id,display_id,created_at,email,total,subtotal,tax_total,shipping_total,discount_total,currency_code,payment_status,fulfillment_status,status,canceled_at,updated_at,metadata," +
  "shipping_address.first_name,shipping_address.last_name,shipping_address.address_1,shipping_address.address_2,shipping_address.city,shipping_address.province,shipping_address.postal_code,shipping_address.country_code,shipping_address.phone," +
  "billing_address.first_name,billing_address.last_name,billing_address.address_1,billing_address.address_2,billing_address.city,billing_address.province,billing_address.postal_code,billing_address.country_code,billing_address.phone," +
  "shipping_methods.name,shipping_methods.price," +
  "items.id,items.title,items.quantity,items.unit_price,items.total,items.subtotal,items.thumbnail,items.variant.id,items.variant.sku,items.variant.product.thumbnail,items.variant.product.images.url," +
  "payment_collections.id,payment_collections.status,payment_collections.captured_amount,payment_collections.amount,payment_collections.authorized_amount,payment_collections.payment_sessions.id,payment_collections.payment_sessions.provider_id,payment_collections.payment_sessions.status,payment_collections.payment_sessions.data," +
  "payment_collections.payments.id,payment_collections.payments.provider_id,payment_collections.payments.data," +
  "fulfillments.id,fulfillments.packed_at,fulfillments.shipped_at,fulfillments.delivered_at,fulfillments.canceled_at";

export const fetchOrder = async (_id: string, email?: string) => {
  try {
    const { data } = await http.get(`/store/custom/orders/${_id}`, {
      params: { fields: orderFields, email }
    });
    return (data?.order ?? data) as any;
  } catch (e: any) {
    try {
      const { data } = await http.get(`/store/orders/${_id}`, {
        params: { fields: orderFields, email }
      });
      return (data?.order ?? data) as any;
    } catch {
      const { data } = await http.get(`/store/orders/${_id}`, {
        params: { email }
      });
      return (data?.order ?? data) as any;
    }
  }
};

export const fetchOrderByCartId = async (cartId: string) => {
  try {
    const { data } = await http.get(`/store/custom/orders/${cartId}`, {
      params: { fields: orderFields }
    });
    return (data?.order ?? data) as any;
  } catch (e: any) {
    try {
      const { data } = await http.get(`/store/orders`, {
        params: { cart_id: cartId, fields: "id" }
      });
      const orders = data?.orders || [];
      const orderId = orders[0]?.id;
      if (orderId) {
        return await fetchOrder(orderId);
      }
      return null;
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = String(err?.response?.data?.message ?? err?.message ?? "");
      if (status === 400 && msg.toLowerCase().includes("unrecognized fields")) {
        const { data } = await http.get(`/store/orders`, {
          params: { cart_id: cartId }
        });
        const orders = data?.orders || [];
        return orders[0] || null;
      }
      throw err;
    }
  }
};

export const useOrderQuery = (id: string, email?: string) => {
  return useQuery<any, Error>({
    queryKey: ["store.order", id, email],
    queryFn: () => {
      if (id && id.startsWith("cart_")) {
        return fetchOrderByCartId(id);
      }
      return fetchOrder(id, email);
    },
    enabled: !!id,
  });
};
