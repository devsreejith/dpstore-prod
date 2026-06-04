import { QueryOptionsType, Category } from "@framework/types";
import http from "@framework/utils/http";
import { API_ENDPOINTS } from "@framework/utils/api-endpoints";
import { useQuery } from "@tanstack/react-query";

export const fetchFeaturedCategories = async () => {
	const { data } = await http.get(API_ENDPOINTS.FEATURED_CATEGORIES);
	const mappedCategories = (data?.product_categories ?? []).map((c: any) => ({
		id: c.id,
		name: c.name,
		slug: c.handle,
		children: c.category_children?.map((child: any) => ({
			id: child.id,
			name: child.name,
			slug: child.handle
		})) ?? []
	}));
	return mappedCategories as Category[];
};
export const useFeaturedCategoriesQuery = (options: QueryOptionsType) => {
	return useQuery<Category[], Error>({
		queryKey: [API_ENDPOINTS.FEATURED_CATEGORIES, options],
		queryFn: fetchFeaturedCategories
	});
};
