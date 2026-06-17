import Layout from "@components/layout/layout";
import AccountLayout from "@components/my-account/account-layout";
import { useCart } from "@contexts/cart/cart.context";
import usePrice from "@framework/product/use-price";
import CartItem from "@components/cart/cart-item";
import EmptyCart from "@components/cart/empty-cart";
import Link from "@components/ui/link";
import { ROUTES } from "@utils/routes";
import cn from "classnames";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import { useUI } from "@contexts/ui.context";
import { useRouter } from "next/router";

export default function CartPage() {
  const { t } = useTranslation("common");
  const { items, total, isEmpty, isCartValid } = useCart();
  const { isAuthorized } = useUI();
  const router = useRouter();
  const { price: cartTotal } = usePrice({
    amount: total,
    currencyCode: "AED",
  });

  return (
    <AccountLayout requireAuth={false}>
      <div className="w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl xl:text-2xl font-bold text-heading">
            {t("text-shopping-cart") || "Cart"}
          </h2>
        </div>

        <div className="mt-6">
          {!isEmpty ? (
            <div className="divide-y divide-gray-200">
              {items?.map((item) => (
                <div key={item.id} className="py-3">
                  <CartItem item={item} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <EmptyCart />
              <h3 className="pt-6 text-lg font-bold text-heading">{t("text-empty-cart")}</h3>
            </div>
          )}
        </div>

        <div className="mt-8">
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
              "w-full px-5 py-3 md:py-4 flex items-center justify-center rounded-md text-sm sm:text-base text-white focus:outline-none transition duration-300",
              (isEmpty || !isCartValid) ? "cursor-not-allowed bg-gray-400 hover:bg-gray-400" : "bg-heading hover:bg-[#008755]"
            )}
          >
            <span className="w-full ltr:pr-5 rtl:pl-5 -mt-0.5 py-0.5">{t("text-proceed-to-checkout")}</span>
            <span className="rtl:mr-auto ltr:ml-auto flex-shrink-0 -mt-0.5 py-0.5 flex">
              <span className="ltr:border-l rtl:border-r border-white ltr:pr-5 rtl:pl-5 py-0.5" />
              {cartTotal}
            </span>
          </Link>
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

