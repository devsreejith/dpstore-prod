import { CategoriesQueryOptionsType, Category } from '@framework/types'
import http from '@framework/utils/http'
import { API_ENDPOINTS } from '@framework/utils/api-endpoints'
import { useQuery } from '@tanstack/react-query'

export const fetchCategories = async () => {
  const { data } = await http.get(API_ENDPOINTS.CATEGORIES, {
    params: { limit: 50, offset: 0 },
  })
  
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

  return {
    categories: {
      data: mappedCategories as Category[],
    },
  };
}
export const useCategoriesQuery = (options: CategoriesQueryOptionsType) => {
  return useQuery<{ categories: { data: Category[] } }, Error>({
    queryKey: [API_ENDPOINTS.CATEGORIES_2, options],
    queryFn: fetchCategories
  })
}
