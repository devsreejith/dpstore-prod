import Link from "@components/ui/link";
import { ROUTES } from "@utils/routes";
import { useWishlist } from "@utils/use-wishlist";
import { formatVariantPrice, formatPrice } from "@framework/product/use-price";
import { IoTrashOutline } from "react-icons/io5";

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

export default function WishlistPlaceholder() {
  const { wishlist, toggleWishlist } = useWishlist();

  return (
    <div>
      {/* Header and navigation block */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#005844] font-body">Wishlist / Favorites</h2>
          <p className="mt-1 text-sm text-gray-700">
            Manage your saved products and add them directly to your cart.
          </p>
        </div>
        <Link
          href={ROUTES.HOME}
          className="text-sm font-semibold bg-[#005844] text-white px-4 py-2 inline-block rounded hover:bg-[#008755] transition whitespace-nowrap font-body"
        >
          Browse Products
        </Link>
      </div>

      {wishlist.length > 0 ? (
        <div className="w-full">
          <div className="border-b border-gray-200 pb-3 mb-4">
            <h3 className="text-sm md:text-base font-bold text-heading">
              My Wishlist ({wishlist.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-150 border-b border-gray-150">
            {wishlist.map((product) => {
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

              const amount = product.sale_price ? Number(product.sale_price) : Number(product.price ?? 0);
              const baseAmount = product.price ? Number(product.price) : undefined;
              const currencyCode = "AED";
              const locale = "en";

              const { price, basePrice, discount } = baseAmount
                ? formatVariantPrice({ amount, baseAmount, currencyCode, locale })
                : { price: formatPrice({ amount, currencyCode, locale }), basePrice: null, discount: null };

              const isOutOfStock = typeof product.quantity === "number" && product.quantity <= 0;

              return (
                <div key={product.id} className="flex gap-4 md:gap-6 p-5 hover:bg-gray-50/30 transition duration-150 items-center justify-between">
                  {/* Left Thumbnail & Info */}
                  <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded border border-gray-200 overflow-hidden bg-white flex items-center justify-center p-1 shadow-sm">
                        <img
                          src={productThumbnail}
                          alt={product?.name}
                          className="object-contain max-h-full max-w-full"
                        />
                      </div>
                      {isOutOfStock && (
                        <span className="text-10px md:text-xs font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 mt-2 uppercase tracking-wide">
                          Unavailable
                        </span>
                      )}
                    </div>

                    {/* Product Metadata */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`${ROUTES.PRODUCT}/${product?.slug}?from=wishlist`}
                        className="text-sm md:text-base font-semibold text-heading hover:text-[#008755] transition line-clamp-2 leading-snug font-body"
                      >
                        {product?.name}
                      </Link>
                      <div className="flex flex-wrap items-baseline gap-2 mt-2 font-mono">
                        <span className="text-base md:text-lg font-bold text-heading font-body">{price}</span>
                        {basePrice && (
                          <>
                            <span className="text-xs md:text-sm text-gray-400 line-through font-body">{basePrice}</span>
                            {discount && (
                              <span className="text-xs md:text-sm font-semibold text-emerald-600 font-body">
                                {discount} OFF
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trash Remove Button */}
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-colors flex-shrink-0"
                    title="Remove from favorites"
                  >
                    <IoTrashOutline className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50 text-center py-10">
          <div className="text-base text-heading font-semibold font-body">No favorites yet</div>
          <p className="mt-1.5 text-sm text-gray-600 font-medium max-w-md mx-auto">
            Add products to your wishlist to quickly find them later and add them to your cart.
          </p>
        </div>
      )}
    </div>
  );
}

