import { QueryOptionsType, Product } from '@framework/types'
import http from '@framework/utils/http'
import { API_ENDPOINTS } from '@framework/utils/api-endpoints'
import { useQuery } from '@tanstack/react-query'

import { mapMedusaProduct } from '@framework/utils/map-products'

export const fetchProducts = async ({ queryKey }: any) => {
  const [_key, options] = queryKey as [string, QueryOptionsType]
  const limit = Number(options?.limit ?? 20)
  const params: any = {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    offset: 0,
    region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
    fields: "id,title,handle,description,thumbnail,images.url,collection.id,collection.title,categories.id,categories.name,categories.handle,variants.id,variants.sku,variants.inventory_quantity,variants.calculated_price,metadata",
  }
  if (options?.text) {
    params.q = options.text;
  } else if (options?.q) {
    params.q = options.q;
  }
  if (options?.collection_id) {
    params.collection_id = options.collection_id;
  }
  const { data } = await http.get(API_ENDPOINTS.PRODUCTS_2, {
    params,
  })
  
  const mappedProducts = (data?.products ?? []).map(mapMedusaProduct);

  return mappedProducts as Product[]
}
export const useProductsQuery = (options: QueryOptionsType) => {
  return useQuery<Product[], Error>({
    queryKey: ['products.simple', options],
    queryFn: fetchProducts
  })
}
