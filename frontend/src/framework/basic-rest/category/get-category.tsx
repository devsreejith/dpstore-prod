import { QueryOptionsType, Category } from "@framework/types";
import http from "@framework/utils/http";
import { API_ENDPOINTS } from "@framework/utils/api-endpoints";
import { useQuery } from "@tanstack/react-query";

export const fetchCategory = async () => {
	const { data } = await http.get(API_ENDPOINTS.CATEGORIES, {
		params: { limit: 50, offset: 0 },
	});
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
	return { category: { data: mappedCategories as Category[] } };
};
export const useCategoriesQuery = (options: QueryOptionsType) => {
	return useQuery<{ category: { data: Category[] } }, Error>({
		queryKey: [API_ENDPOINTS.CATEGORIES, options],
		queryFn: fetchCategory
	});
};
