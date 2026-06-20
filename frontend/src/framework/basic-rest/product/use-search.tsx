import { QueryOptionsType, Product } from "@framework/types";
import http from "@framework/utils/http";
import { API_ENDPOINTS } from "@framework/utils/api-endpoints";
import { useQuery } from "@tanstack/react-query";

import { mapMedusaProduct } from "@framework/utils/map-products";

export const fetchSearchedProducts = async ({ queryKey }: any) => {
  const [_key, options] = queryKey;
  const { data } = await http.get(API_ENDPOINTS.SEARCH, {
    params: {
      q: options?.text ?? "",
      limit: options?.limit ?? 20,
      offset: 0,
      region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
      fields: "id,title,handle,description,thumbnail,images.url,collection.id,collection.title,categories.id,categories.name,categories.handle,variants.id,variants.sku,variants.inventory_quantity,variants.calculated_price,metadata",
    },
  });

  const mappedProducts = (data?.products ?? []).map(mapMedusaProduct);

  return mappedProducts as Product[];
};

export const useSearchQuery = (options: QueryOptionsType) => {
  return useQuery<Product[], Error>({
    queryKey: [API_ENDPOINTS.SEARCH, options],
    queryFn: fetchSearchedProducts
  });
};
