import { Product } from "@framework/types";
import http from "@framework/utils/http";
import { API_ENDPOINTS } from "@framework/utils/api-endpoints";
import { useQuery } from "@tanstack/react-query";

import { mapMedusaProduct } from "@framework/utils/map-products";

export const fetchProduct = async (_slug: string) => {
	const { data } = await http.get(API_ENDPOINTS.PRODUCTS, {
		params: {
			handle: _slug,
			region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
			fields: "id,title,handle,description,thumbnail,images.url,collection.id,collection.title,variants.id,variants.sku,variants.inventory_quantity,variants.calculated_price,metadata",
		}
	});
	const medusaProduct = data?.products?.[0];
	if (!medusaProduct) throw new Error("Product not found");

	return mapMedusaProduct(medusaProduct);
};

export const useProductQuery = (slug: string) => {
	return useQuery<Product, Error>({
		queryKey: [API_ENDPOINTS.PRODUCT, slug],
		queryFn: () => fetchProduct(slug)
	});
};
