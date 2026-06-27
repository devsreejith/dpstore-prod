import ProductCard from "@components/product/product-card";
import Button from "@components/ui/button";
import type { FC } from "react";
import { useProductsQuery } from "@framework/product/get-all-products";
import { useRouter } from "next/router";
import ProductFeedLoader from "@components/ui/loaders/product-feed-loader";
import { useTranslation } from "next-i18next";
import { Product } from "@framework/types";
interface ProductGridProps {
  className?: string;
  gridClassName?: string;
}
export const ProductGrid: FC<ProductGridProps> = ({ className = "", gridClassName }) => {
  const router = useRouter();
  const { query } = router;
  const slug =
    typeof query?.slug === "string"
      ? query.slug
      : Array.isArray(query?.slug)
      ? query.slug[0]
      : undefined;
  const options: any = { ...query };
  if (slug && !options.category) {
    options.category = slug;
  }
  delete options.slug;
  const {
    isFetching: isLoading,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage,
    data,
    error,
  } = useProductsQuery({ limit: 10, ...options });
  const { t } = useTranslation("common");
  if (error) return <p>{error.message}</p>;
  const hasProducts = data?.pages?.some(page => page?.data && page.data.length > 0);

  return (
    <>
      <div
        className={gridClassName ? gridClassName : `grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-x-3 lg:gap-x-5 xl:gap-x-7 gap-y-3 xl:gap-y-5 2xl:gap-y-8 ${className}`}
      >
        {isLoading && !data?.pages?.length ? (
          <ProductFeedLoader limit={20} uniqueKey="search-product" />
        ) : !hasProducts ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center gap-3 bg-white rounded-lg border border-gray-100 p-8 shadow-sm">
            <svg className="w-12 h-12 text-gray-300 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
            </svg>
            <h3 className="text-base font-bold text-heading font-body">No products found</h3>
            <p className="text-xs text-gray-400 max-w-xs font-body">We couldn't find any matches for your query. Try checking your spelling or adjusting your filters.</p>
          </div>
        ) : (
          data?.pages?.map((page) => {
            return page?.data?.map((product: Product) => (
              <ProductCard
                key={`product--key${product.id}`}
                product={product}
                variant="grid"
              />
            ));
          })
        )}
      </div>
      <div className="text-center pt-8 xl:pt-14">
        {hasNextPage && (
          <Button
            loading={loadingMore}
            disabled={loadingMore}
            onClick={() => fetchNextPage()}
            variant="slim"
          >
            {t("button-load-more")}
          </Button>
        )}
      </div>
    </>
  );
};
