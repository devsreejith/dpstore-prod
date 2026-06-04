import { QueryOptionsType, Product } from "@framework/types";
import http from "@framework/utils/http";
import { API_ENDPOINTS } from "@framework/utils/api-endpoints";
import { useQuery } from "@tanstack/react-query";
import { mapMedusaProduct } from "@framework/utils/map-products";

export const fetchFeaturedProducts = async ({ queryKey }: any) => {
  const [_key, options] = queryKey as [string, QueryOptionsType]
  const limit = Number(options?.limit ?? 20)
  const { data } = await http.get(API_ENDPOINTS.FEATURED_PRODUCTS, {
    params: {
      limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
      offset: 0,
      region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
    },
  });
  return (data?.products ?? []).map(mapMedusaProduct) as Product[];
};

export const useFeaturedProductsQuery = (options: QueryOptionsType) => {
  return useQuery<Product[], Error>({
    queryKey: ["products.featured", options],
    queryFn: fetchFeaturedProducts,
  });
};
