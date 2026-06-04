import { QueryOptionsType, Product } from "@framework/types";
import http from "@framework/utils/http";
import { API_ENDPOINTS } from "@framework/utils/api-endpoints";
import { useQuery } from "@tanstack/react-query";
import { mapMedusaProduct } from "@framework/utils/map-products";

export const fetchRelatedProducts = async () => {
	const { data } = await http.get(API_ENDPOINTS.RELATED_PRODUCTS, {
		params: {
			limit: 5,
			offset: 0,
			region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
		},
	});
	return (data?.products ?? []).map(mapMedusaProduct) as Product[];
};
export const useRelatedProductsQuery = (options: QueryOptionsType) => {
	return useQuery<Product[], Error>({
		queryKey: [API_ENDPOINTS.RELATED_PRODUCTS, options],
		queryFn: fetchRelatedProducts
	});
};
