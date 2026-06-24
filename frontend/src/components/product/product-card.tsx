import cn from "classnames";
import { type FC } from "react";
import { useUI } from "@contexts/ui.context";
import usePrice from "@framework/product/use-price";
import { Product } from "@framework/types";
import ProductViewIcon from "@components/icons/product-view-icon";
import ProductWishIcon from "@components/icons/product-wish-icon";
import RatingDisplay from "@components/common/rating-display";
import { useWishlist } from "@utils/use-wishlist";

interface ProductProps {
  product: Product;
  className?: string;
  contactClassName?: string;
  imageContentClassName?: string;
  variant?:
    | "grid"
    | "gridSlim"
    | "list"
    | "listSmall"
    | "gridModern"
    | "gridModernWide"
    | "gridTrendy"
    | "rounded"
    | "circle";
  imgWidth?: number | string;
  imgHeight?: number | string;
  imgLoading?: "eager" | "lazy";
  hideProductDescription?: boolean;
  showCategory?: boolean;
  showRating?: boolean;
  bgTransparent?: boolean;
  bgGray?: boolean;
  demoVariant?: "ancient";
  disableBorderRadius?: boolean;
}

const normalizeMediaSrc = (src: any) => {
  const v = String(src ?? "").trim();
  if (!v) return "";

  const backend = String(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000").trim().replace(/\/$/, "");

  if (/^https?:\/\//i.test(v)) {
    return v;
  }

  if (v.startsWith("uploads/") || v.startsWith("/uploads/") || v.startsWith("static/") || v.startsWith("/static/")) {
    const cleanPath = v.startsWith("/") ? v : `/${v}`;
    return `${backend}${cleanPath}`;
  }

  if (v.startsWith("/assets/")) return v;
  if (!v.startsWith("/")) return `/${v}`;
  return v;
};

const ProductCard: FC<ProductProps> = ({
  product,
  className = "",
  imageContentClassName = "",
  variant = "list",
  imgHeight = 440,
  hideProductDescription = false,
  showCategory = false,
  showRating = false,
  bgTransparent = false,
}) => {
  const { openModal, setModalView, setModalData } = useUI();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const productWishlisted = isInWishlist(product?.id);

  const productThumbnail = (() => {
    const candidates = [
      product?.thumbnail,
      product?.image?.thumbnail,
      product?.image?.original,
      (product as any)?.images?.[0]?.url,
      (product as any)?.images?.[0]?.src,
    ];
    for (const c of candidates) {
      const n = normalizeMediaSrc(c);
      if (n) return n;
    }
    return "/assets/placeholder/order-product.svg";
  })();

  const resolvedHeight = (() => {
    const h = Number(imgHeight);
    if (
      !isNaN(h) &&
      h > 280 &&
      (variant === "grid" ||
        variant === "gridModern" ||
        variant === "gridModernWide" ||
        variant === "gridTrendy")
    ) {
      return 280;
    }
    return imgHeight;
  })();

  const { price, basePrice, discount } = usePrice({
    amount: product.sale_price ? product.sale_price : product.price,
    baseAmount: product.price,
    currencyCode: "AED",
  });

  function handlePopupView() {
    setModalData({ data: product });
    setModalView("PRODUCT_VIEW");
    return openModal();
  }

  return (
    <div
      className={cn(
        "group box-border flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300",
        {
          "pe-0 pb-2 md:pb-3 lg:pb-4 bg-white rounded-md": bgTransparent === false && variant !== "list" && variant !== "listSmall",
          "pe-0 pb-2 md:pb-3 lg:pb-4 bg-transparent": bgTransparent === true && variant !== "list" && variant !== "listSmall",
          "border border-gray-200 rounded-md hover:shadow-product": variant === "grid" || variant === "gridModern" || variant === "gridModernWide" || variant === "gridTrendy",
          "h-full": variant === "grid" || variant === "gridSlim" || variant === "gridModern" || variant === "gridModernWide" || variant === "gridTrendy",
        },
        className
      )}
      onClick={handlePopupView}
      title={product?.name}
    >
      <div className={cn("relative flex-shrink-0", imageContentClassName)}>
        <div className="flex ltr:mr-auto rtl:ml-auto select-none overflow-hidden justify-center bg-[#F1F3F4] rounded-t-md">
          <img
            src={productThumbnail}
            alt={product?.name}
            className="object-cover w-full h-full transition duration-300 ease-in-out group-hover:scale-105"
            style={{ width: "100%", height: resolvedHeight }}
          />
        </div>
        {/* Floating Icons Stack (bottom-right of image) */}
        <div className="absolute bottom-3.5 ltr:right-3.5 rtl:left-3.5 z-10 flex flex-col gap-y-2 items-center w-[45px]">
          {/* Thumbnail/View Icon - only visible on hover */}
          <button
            type="button"
            className="w-full h-[35px] flex items-center justify-center rounded-md bg-white shadow-md border border-gray-150 transition-all duration-300 opacity-100 sm:opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handlePopupView();
            }}
            aria-label="Quick View"
          >
            <ProductViewIcon className="w-full h-full" />
          </button>

          {/* Wishlist Button - only visible on hover */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
            className={cn(
              "w-full h-[35px] rounded-md bg-white shadow-md border border-gray-150 flex items-center justify-center transition-all duration-300 opacity-100 sm:opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 focus:outline-none"
            )}
            aria-label="Toggle Wishlist"
          >
            <ProductWishIcon
              active={productWishlisted}
              className="w-full h-full"
            />
          </button>
        </div>
        <div className="absolute top-3.5 ltr:left-3.5 rtl:right-3.5 ltr:sm:left-5 rtl:sm:right-5 flex flex-col gap-y-1.5">
          {product.quantity <= 0 && (
            <span className="bg-[#E4002B] text-white text-10px md:text-xs leading-5 rounded-md inline-block px-1.5 sm:px-1.5 xl:px-2 py-0.5 sm:py-1 font-semibold">
              <p>Out of stock</p>
            </span>
          )}
          {discount && (
            <span className="bg-[#E4002B] text-white text-10px md:text-xs leading-5 rounded-md inline-block px-1.5 sm:px-1.5 xl:px-2 py-0.5 sm:py-1 font-semibold">
              <p>
                {discount} <span className="hidden sm:inline">OFF</span>
              </p>
            </span>
          )}
          {((product as any)?.is_featured === true || (product as any)?.isNewArrival === true) && (
            <span className="bg-heading text-white text-10px md:text-xs leading-5 rounded-md inline-block px-1.5 sm:px-1.5 xl:px-2 py-0.5 sm:py-1 font-semibold">
              <p>
                New <span className="hidden sm:inline">Arrival</span>
              </p>
            </span>
          )}
        </div>


      </div>
      <div
        className={cn(
          "w-full overflow-hidden p-2",
          {
            "md:px-2.5 xl:px-4": variant === "grid",
            "px-2 md:px-2.5 xl:px-4 h-full flex flex-col":
              variant === "gridModern" ||
              variant === "gridModernWide" ||
              variant === "gridTrendy",
          }
        )}
      >
        <div className="flex-grow">
          {showCategory && (
            <span className="text-11px text-body uppercase inline-block mb-1.5">
              {(product?.collection as any)?.title || "Category"}
            </span>
          )}
          <h2 className="text-sm md:text-base font-semibold text-heading truncate mb-1">
            {product?.name}
          </h2>
          {!hideProductDescription && (
            <p className="text-xs text-body leading-normal line-clamp-2 mb-2">
              {product?.description}
            </p>
          )}
          {showRating && (
            <div className="flex items-center gap-x-1 mb-2">
              <RatingDisplay rating={4} />
              <span className="text-11px text-body mt-0.5">(25)</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
          <div className="flex items-baseline gap-x-2">
            <span className="text-sm md:text-base font-semibold text-heading font-segoe">
              {price}
            </span>
            {discount && (
              <del className="text-xs md:text-sm text-gray-400 font-segoe line-through">
                {basePrice}
              </del>
            )}
          </div>
        </div>
      </div>


    </div>
  );
};

export default ProductCard;
