import { QueryOptionsType } from "@framework/types";
import http from "@framework/utils/http";
import { useQuery } from "@tanstack/react-query";

export const fetchOrders = async () => {
  try {
    const { data } = await http.get(`/store/orders`);
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
