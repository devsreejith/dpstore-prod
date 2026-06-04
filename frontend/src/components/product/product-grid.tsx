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

  return (
    <>
      <div
        className={gridClassName ? gridClassName : `grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-x-3 lg:gap-x-5 xl:gap-x-7 gap-y-3 xl:gap-y-5 2xl:gap-y-8 ${className}`}
      >
        {isLoading && !data?.pages?.length ? (
          <ProductFeedLoader limit={20} uniqueKey="search-product" />
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
