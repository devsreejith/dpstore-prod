import http from "@framework/utils/http";
import { useQuery } from "@tanstack/react-query";

export const fetchOrder = async (_id: string) => {
  try {
    const { data } = await http.get(`/store/orders/${_id}`);
    return (data?.order ?? data) as any;
  } catch (e: any) {
    const status = e?.response?.status;
    const msg = String(e?.response?.data?.message ?? e?.message ?? "");
    if (status === 400 && msg.toLowerCase().includes("unrecognized fields")) {
      const { data } = await http.get(`/store/orders/${_id}`);
      return (data?.order ?? data) as any;
    }
    throw e;
  }
};
export const useOrderQuery = (id: string) => {
  return useQuery<any, Error>({
    queryKey: ["store.order", id],
    queryFn: () => fetchOrder(id)
  });
};
