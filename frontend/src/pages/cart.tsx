import Layout from "@components/layout/layout";
import AccountLayout from "@components/my-account/account-layout";
import { useCart } from "@contexts/cart/cart.context";
import usePrice from "@framework/product/use-price";
import EmptyCart from "@components/cart/empty-cart";
import Link from "@components/ui/link";
import { ROUTES } from "@utils/routes";
import cn from "classnames";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import { useUI } from "@contexts/ui.context";
import { useRouter } from "next/router";
import { IoTrashOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import { generateCartItemName } from "@utils/generate-cart-item-name";
import { FiTruck, FiHeadphones } from "react-icons/fi";

const CartPageItem = ({ item, addItemToCart, removeItemFromCart, clearItemFromCart, inventoryMap }: any) => {
  const stock = inventoryMap[item.variant_id];
  const isOutOfStock = stock !== undefined && stock <= 0;
  const isInsufficientStock = stock !== undefined && stock > 0 && stock < item.quantity;
  const { price } = usePrice({
    amount: item.price,
    currencyCode: "AED",
  });
  
  const imageSrc = (() => {
    const v = String(item?.image ?? '').trim();
    if (!v) return '/assets/placeholder/cart-item.svg';
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith('/')) return v;
    return `/${v}`;
  })();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center py-6 gap-6 first:pt-0 last:pb-0">
      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center p-4 border border-gray-100">
        <img src={imageSrc} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
      </div>
      
      <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href={`${ROUTES.PRODUCT}/${item?.slug}?from=cart`} className="font-bold text-[#005844] text-sm md:text-base hover:text-[#008755] transition uppercase">
            {generateCartItemName(item.name, item.attributes)}
          </Link>
          <span className="text-xs text-gray-400 mt-1">Unit Price</span>
          <span className="font-bold text-[#005844] text-sm">{price}</span>
          
          <div className="mt-3 flex items-center">
            <div className="flex items-center border border-gray-150 rounded-md overflow-hidden h-9 w-24">
              <button 
                onClick={() => removeItemFromCart(item.id)}
                className="w-1/3 h-full flex items-center justify-center text-[#008755] font-bold hover:bg-gray-50 transition"
              >
                -
              </button>
              <span className="w-1/3 h-full flex items-center justify-center text-sm font-bold text-[#005844]">
                {item.quantity}
              </span>
              <button 
                onClick={() => addItemToCart(item, 1)}
                disabled={stock !== undefined && item.quantity >= stock}
                className="w-1/3 h-full flex items-center justify-center text-[#008755] font-bold hover:bg-gray-50 transition disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
          
          {isOutOfStock && <span className="text-xs text-red-500 font-semibold mt-2">Out of stock</span>}
          {isInsufficientStock && <span className="text-xs text-red-500 font-semibold mt-2">Only {stock} left</span>}
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto mt-2 sm:mt-0">
          <button
            onClick={() => clearItemFromCart(item.id)}
            className="flex items-center gap-1.5 border border-rose-200 text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-md text-xs font-semibold transition"
          >
            <IoTrashOutline className="text-sm" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CartPage() {
  const { t } = useTranslation("common");
  const { items, total, isEmpty, isCartValid, addItemToCart, removeItemFromCart, clearItemFromCart, inventoryMap } = useCart();
  const { isAuthorized } = useUI();
  const router = useRouter();
  const { price: cartTotal } = usePrice({
    amount: total,
    currencyCode: "AED",
  });

  return (
    <AccountLayout requireAuth={false} wrapChildrenInCard={false}>
      <div className="w-full mx-auto pb-10">
        <div className="mb-8 text-left">
          <h1 className="text-xl md:text-2xl font-bold text-[#005844] mb-2 font-body">
            Shopping Cart
          </h1>
          <p className="text-gray-400 text-sm md:text-base font-body">
            Review your items and proceed to checkout.
          </p>
        </div>

        {!isEmpty ? (
          <div className="flex flex-col lg:flex-row gap-6 items-start font-body">
            {/* Left Column - Cart Items */}
            <div className="w-full lg:w-2/3">
              <div className="bg-white rounded-xl border border-gray-150 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 md:p-6">
                <h2 className="text-base font-bold text-[#005844] mb-6 border-b border-gray-100 pb-4">
                  Cart Items ({items.length})
                </h2>
                <div className="divide-y divide-gray-100">
                  {items?.map((item) => (
                    <CartPageItem 
                      key={item.id} 
                      item={item} 
                      addItemToCart={addItemToCart}
                      removeItemFromCart={removeItemFromCart}
                      clearItemFromCart={clearItemFromCart}
                      inventoryMap={inventoryMap}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="w-full lg:w-1/3 flex flex-col lg:sticky lg:top-4">
              <div className="bg-white rounded-xl border border-gray-150 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 md:p-6">
                <h2 className="text-base font-bold text-[#005844] mb-8">
                  Order Summary
                </h2>
                
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-500 text-sm">Subtotal ({items.length} item{items.length !== 1 && 's'})</span>
                  <span className="font-bold text-[#005844] text-base">{cartTotal}</span>
                </div>
                
                <div className="border-t border-gray-100 pt-6">
                  <Link
                    href={isEmpty === false && isCartValid === true ? ROUTES.CHECKOUT : "/"}
                    onClick={(e) => {
                      if (isEmpty || !isCartValid) {
                        e.preventDefault();
                        return;
                      }
                      if (!isAuthorized) {
                        e.preventDefault();
                        router.push(`/signin?redirect=${encodeURIComponent(ROUTES.CHECKOUT)}`);
                      }
                    }}
                    className={cn(
                      "w-full h-12 flex items-center justify-between px-5 rounded-md text-sm font-bold text-white transition duration-300",
                      (isEmpty || !isCartValid) ? "cursor-not-allowed bg-gray-400" : "bg-[#005844] hover:bg-[#008755]"
                    )}
                  >
                    <span>Proceed To Checkout</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-150 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <EmptyCart />
            <h3 className="pt-6 text-xl font-bold text-[#005844]">{t("text-empty-cart")}</h3>
            <Link href="/" className="mt-4 bg-[#005844] text-white px-6 py-2.5 rounded-md font-bold hover:bg-[#008755] transition">
              Continue Shopping
            </Link>
          </div>
        )}

        {/* Bottom Features Banner */}
        <div className="mt-6 bg-white rounded-xl border border-gray-150 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 md:p-8 flex flex-col md:flex-row gap-8 md:gap-0 justify-between items-center md:items-start divide-y md:divide-y-0 md:divide-x divide-gray-100 font-body">
          {/* Feature 1 */}
          <div className="flex-1 flex items-center justify-center md:justify-start gap-4 w-full md:px-8 first:pl-0 last:pr-0 pt-4 md:pt-0 first:pt-0">
            <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
              <IoShieldCheckmarkOutline className="text-xl text-[#008755]" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-sm font-bold text-[#005844]">Secure Payments</h4>
              <p className="text-xs text-gray-400 mt-1">100% secure and encrypted</p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex-1 flex items-center justify-center md:justify-start gap-4 w-full md:px-8 pt-4 md:pt-0">
            <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
              <FiTruck className="text-xl text-[#008755]" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-sm font-bold text-[#005844]">Fast Delivery</h4>
              <p className="text-xs text-gray-400 mt-1">Quick and reliable delivery</p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="flex-1 flex items-center justify-center md:justify-start gap-4 w-full md:px-8 pt-4 md:pt-0">
            <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
              <FiHeadphones className="text-xl text-[#008755]" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-sm font-bold text-[#005844]">Need Help?</h4>
              <p className="text-xs text-gray-400 mt-1">We&apos;re here to help you</p>
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

CartPage.Layout = Layout;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale!, ["common", "forms", "menu", "footer"])),
    },
  };
};

