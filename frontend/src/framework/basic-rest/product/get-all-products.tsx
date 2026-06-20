import { QueryOptionsType, Product } from "@framework/types";
import { API_ENDPOINTS } from "@framework/utils/api-endpoints";
import http from "@framework/utils/http";
import { useInfiniteQuery } from "@tanstack/react-query";
type PaginatedProduct = {
	data: Product[];
	paginatorInfo: any;
};

function normalizeQueryOptions(input: unknown): QueryOptionsType {
	if (!input || typeof input !== "object") return {};
	const src = input as Record<string, unknown>;
	const out: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(src)) {
		if (value === undefined || value === null) continue;
		if (Array.isArray(value)) {
			const first = value.find((v) => v !== undefined && v !== null);
			if (first === undefined || first === null) continue;
			out[key] = typeof first === "string" ? first : String(first);
			continue;
		}
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			out[key] = value;
		}
	}

	const limitRaw = out.limit;
	const limitNum = typeof limitRaw === "number" ? limitRaw : Number(limitRaw);
	out.limit = Number.isFinite(limitNum) && limitNum > 0 ? limitNum : 10;

	return out as QueryOptionsType;
}

import { mapMedusaProduct } from "@framework/utils/map-products";

const fetchProducts = async ({ queryKey, pageParam }: any) => {
	const [_key, options] = queryKey as [string, QueryOptionsType];
	const safeOptions = normalizeQueryOptions(options);
	const endpoint = API_ENDPOINTS.PRODUCTS;

	const isClientSideFiltered = !!(safeOptions?.sort || safeOptions?.price);
	const params: any = {
		limit: isClientSideFiltered ? 200 : (safeOptions?.limit ?? 10),
		offset: isClientSideFiltered ? 0 : (typeof pageParam === "number" ? pageParam : 0),
		region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
		fields: "id,title,handle,description,thumbnail,images.url,collection.id,collection.title,categories.id,categories.name,categories.handle,variants.id,variants.sku,variants.inventory_quantity,variants.calculated_price,metadata,created_at",
	};

	if (safeOptions?.collection_id) {
		params.collection_id = safeOptions.collection_id;
	}

	if (safeOptions?.text) {
		params.q = safeOptions.text;
	} else if (safeOptions?.q) {
		params.q = safeOptions.q;
	}

	if (safeOptions?.category) {
		params.category = safeOptions.category;
	}

	const { data } = await http.get(endpoint, { params });
	
	const mappedProducts = (data?.products ?? []).map(mapMedusaProduct);

	let finalProducts = mappedProducts;

	// In-memory Price Filtering
	if (safeOptions?.price) {
		const priceRanges = safeOptions.price.split(",");
		finalProducts = finalProducts.filter((p: any) => {
			return priceRanges.some((range) => {
				const parts = range.split("-");
				const min = parts[0] && !isNaN(Number(parts[0])) ? Number(parts[0]) : 0;
				const max = parts[1] && !isNaN(Number(parts[1])) ? Number(parts[1]) : Infinity;
				return p.price >= min && p.price <= max;
			});
		});
	}

	// In-memory Sorting
	if (safeOptions?.sort) {
		if (safeOptions.sort === "price_asc") {
			finalProducts.sort((a: any, b: any) => a.price - b.price);
		} else if (safeOptions.sort === "price_desc") {
			finalProducts.sort((a: any, b: any) => b.price - a.price);
		} else if (safeOptions.sort === "newest") {
			finalProducts.sort((a: any, b: any) => {
				const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
				const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
				return timeB - timeA;
			});
		}
	}

	// Pagination
	let paginatedProducts = finalProducts;
	let total = data?.count ?? 0;
	let hasMore = false;

	if (isClientSideFiltered) {
		total = finalProducts.length;
		const reqLimit = safeOptions?.limit ?? 10;
		const reqOffset = typeof pageParam === "number" ? pageParam : 0;
		paginatedProducts = finalProducts.slice(reqOffset, reqOffset + reqLimit);
		hasMore = total > reqOffset + reqLimit;
	} else {
		hasMore = data?.count > params.offset + params.limit;
	}

	return {
		data: paginatedProducts,
		paginatorInfo: {
			nextPageUrl: hasMore ? (isClientSideFiltered ? (typeof pageParam === "number" ? pageParam : 0) + (safeOptions?.limit ?? 10) : params.offset + params.limit) : undefined,
			total: total,
		}
	} as PaginatedProduct;
};

const useProductsQuery = (options: QueryOptionsType) => {
	const safeOptions = normalizeQueryOptions(options);
	return useInfiniteQuery<PaginatedProduct, Error>({
		queryKey: ["products.infinite", safeOptions],
		queryFn: fetchProducts,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => lastPage?.paginatorInfo?.nextPageUrl || undefined,
	});
};

export { useProductsQuery, fetchProducts };
