import ProductsBlockCarousel from '@containers/products-block-carousel'
import { useProductsQuery } from '@framework/product/get-all-products-2'

export default function RecentProductFeed() {
  const { data, isLoading, error } = useProductsQuery({
    limit: 10,
  })
  const products = Array.isArray(data) ? data : []

  return (
    <ProductsBlockCarousel
      sectionHeading='text-recently-view-products'
      products={products.slice(2, 7)}
      loading={isLoading}
      error={error?.message}
      uniqueKey='new-arrivals'
      type='gridTrendy'
      className='mb-12 md:mb-14 xl:mb-16'
      imgWidth={344}
      imgHeight={344}
    />
  )
}
