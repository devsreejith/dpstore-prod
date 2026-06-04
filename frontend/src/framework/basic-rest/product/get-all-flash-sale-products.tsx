import { QueryOptionsType, Product } from "@framework/types";
import http from "@framework/utils/http";
import { API_ENDPOINTS } from "@framework/utils/api-endpoints";
import { useQuery } from "@tanstack/react-query";
import { mapMedusaProduct } from "@framework/utils/map-products";

export const fetchFlashSaleProducts = async () => {
  const { data } = await http.get(API_ENDPOINTS.FLASH_SALE_PRODUCTS, {
    params: {
      limit: 20,
      offset: 0,
      region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
    },
  });
  const products = (data?.products ?? []).map(mapMedusaProduct).map((p: Product) => ({
    sold: 0,
    ...p,
  }));

  return {
    productFlashSellGrid: products,
    productFlashSellList: products,
    productFlashSellGridOne: products,
    productFlashSellGridTwo: products,
  };
};

export const useFlashSaleProductsQuery = (options: QueryOptionsType) => {
  return useQuery<any, Error>({
    queryKey: [API_ENDPOINTS.FLASH_SALE_PRODUCTS, options],
    queryFn: fetchFlashSaleProducts,
  });
};
