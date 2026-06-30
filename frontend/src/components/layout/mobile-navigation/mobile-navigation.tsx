import { useState } from "react";
import Link from "@components/ui/link";
import {
  IoSearchOutline,
  IoCartOutline,
  IoPersonOutline,
  IoHeartOutline,
  IoLocationOutline,
  IoLockClosedOutline,
  IoLogOutOutline,
  IoChevronForwardOutline,
  IoCubeOutline,
} from "react-icons/io5";
import UserIcon from "@components/icons/user-icon";
import MenuIcon from "@components/icons/menu-icon";
import HomeIcon from "@components/icons/home-icon";
import { useUI } from "@contexts/ui.context";
import { useRouter } from "next/router";
import { ROUTES } from "@utils/routes";
import dynamic from "next/dynamic";
import { Drawer } from "@components/common/drawer/drawer";
import { getDirection } from "@utils/get-direction";
import motionProps from "@components/common/drawer/motion";
import { useCart } from "@contexts/cart/cart.context";
import { useQuery } from "@tanstack/react-query";
import http from "@framework/utils/http";
import { useLogoutMutation } from "@framework/auth/use-logout";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "next-i18next";

const AuthMenu = dynamic(() => import("@components/layout/header/auth-menu"), {
  ssr: false,
});
const MobileMenu = dynamic(
  () => import("@components/layout/header/mobile-menu")
);

const BottomNavigation: React.FC = () => {
  const {
    openSidebar,
    closeSidebar,
    displaySidebar,
    openSearch,
    openModal,
    setModalView,
    isAuthorized,
    openCart,
  } = useUI();

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const { mutate: logout } = useLogoutMutation();
  const { t } = useTranslation("common");

  const router = useRouter();
  const { pathname, locale } = router;
  const dir = getDirection(locale);
  const contentWrapperCSS = dir === "ltr" ? { left: 0 } : { right: 0 };

  const isHomeActive = pathname === "/";
  const isAccountActive = pathname.startsWith("/my-account") || isAccountMenuOpen;

  function handleLogin() {
    setModalView("LOGIN_VIEW");
    return openModal();
  }
  function handleMobileMenu() {
    return openSidebar();
  }

  // Fetch logged in customer profile to show customer info dynamically in the bottom drawer
  const customerQuery = useQuery({
    queryKey: ["store.customer.me.bottomNav"],
    queryFn: async () => {
      const { data } = await http.get("/store/customers/me");
      return (data as any)?.customer ?? data;
    },
    enabled: isAuthorized === true,
    retry: false,
  });

  const customerName = (() => {
    const c: any = customerQuery.data;
    const first = String(c?.first_name ?? "").trim();
    const last = String(c?.last_name ?? "").trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    const email = String(c?.email ?? "").trim();
    if (email) return email.split("@")[0] || email;
    return null;
  })();

  const customerEmail = (customerQuery.data as any)?.email;

  const closeAccountMenu = () => {
    setIsAccountMenuOpen(false);
  };

  return (
    <>
      <div className="lg:hidden fixed z-10 bottom-0 flex items-center justify-between shadow-bottomNavigation text-gray-700 body-font bg-white w-full h-16 px-4 md:px-8 pb-1 pt-2">
        <button
          aria-label="Menu"
          className="menuBtn flex flex-col items-center justify-center flex-shrink-0 outline-none focus:outline-none"
          onClick={handleMobileMenu}
        >
          <MenuIcon className="text-gray-700" />
          <span className="text-[10px] mt-1 text-gray-500 font-semibold font-body leading-none">
            {locale === "ar" ? "القائمة" : "Menu"}
          </span>
        </button>
        <button
          className="flex flex-col items-center justify-center flex-shrink-0 h-auto relative focus:outline-none"
          onClick={openSearch}
          aria-label="search-button"
        >
          <IoSearchOutline className="w-5 h-5 text-heading" />
          <span className="text-[10px] mt-1 text-gray-500 font-semibold font-body leading-none">
            {locale === "ar" ? "بحث" : "Search"}
          </span>
        </button>
        <Link href="/" className="flex flex-col items-center justify-center flex-shrink-0">
          <HomeIcon color={isHomeActive ? "#008755" : "currentColor"} />
          <span className={`text-[10px] mt-1 font-semibold font-body leading-none ${isHomeActive ? "text-[#008755]" : "text-gray-500"}`}>
            {locale === "ar" ? "الرئيسية" : "Home"}
          </span>
        </Link>
        <button
          onClick={openCart}
          className="flex flex-col items-center justify-center flex-shrink-0 h-auto relative focus:outline-none"
          aria-label="cart-button"
        >
          <div className="relative">
            <IoCartOutline className="w-5 h-5 text-heading" />
            <span className="cart-counter-badge flex items-center justify-center bg-[#008755] text-white absolute -top-1.5 ltr:-right-2.5 rtl:-left-2.5 rounded-full font-bold text-[9px] w-4 h-4">
              {totalItems}
            </span>
          </div>
          <span className="text-[10px] mt-1 text-gray-500 font-semibold font-body leading-none">
            {locale === "ar" ? "السلة" : "Cart"}
          </span>
        </button>
        <AuthMenu
          isAuthorized={isAuthorized}
          href={ROUTES.ACCOUNT}
          className="flex flex-col items-center justify-center flex-shrink-0"
          btnProps={{
            className: "flex flex-col items-center justify-center flex-shrink-0 focus:outline-none",
            children: (
              <>
                <UserIcon color={isAccountActive ? "#008755" : "currentColor"} />
                <span className={`text-[10px] mt-1 font-semibold font-body leading-none ${isAccountActive ? "text-[#008755]" : "text-gray-500"}`}>
                  {locale === "ar" ? "حسابي" : "Account"}
                </span>
              </>
            ),
            onClick: handleLogin,
          }}
        >
          <button
            onClick={() => setIsAccountMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-shrink-0 focus:outline-none"
          >
            <UserIcon color={isAccountActive ? "#008755" : "currentColor"} />
            <span className={`text-[10px] mt-1 font-semibold font-body leading-none ${isAccountActive ? "text-[#008755]" : "text-gray-500"}`}>
              {locale === "ar" ? "حسابي" : "Account"}
            </span>
          </button>
        </AuthMenu>
      </div>

      {/* Account Bottom Sheet Menu Overlay */}
      <AnimatePresence>
        {isAccountMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={closeAccountMenu}
              className="fixed inset-0 z-40 bg-black lg:hidden"
            />

            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-2xl lg:hidden flex flex-col max-h-[85vh] overflow-y-auto font-body animate-fade-in-up"
            >
              {/* Drag Handle */}
              <div className="w-full flex justify-center py-4 cursor-pointer" onClick={closeAccountMenu}>
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Profile Card Info */}
              <div className="flex items-center gap-4 px-6 pb-6 border-b border-gray-100">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#EBF5F1] text-[#008755] flex-shrink-0">
                  <IoPersonOutline className="w-8 h-8" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-gray-400 font-semibold mb-0.5">
                    {t("text-hello", "Hello,")}
                  </span>
                  <span className="text-lg font-bold text-[#008755] leading-tight truncate">
                    {customerName || "User"}
                  </span>
                  {customerEmail && (
                    <span className="text-[13px] text-gray-500 mt-0.5 leading-none truncate">
                      {customerEmail}
                    </span>
                  )}
                </div>
              </div>

              {/* Menu Options List */}
              <div className="flex flex-col px-4 py-2">
                {/* Profile Details */}
                <Link
                  href={ROUTES.ACCOUNT_DETAILS}
                  onClick={closeAccountMenu}
                  className="flex items-center justify-between py-4 px-3 hover:bg-gray-50 border-b border-gray-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <IoPersonOutline className="w-5 h-5 text-[#008755]" />
                    <span className="text-sm font-semibold text-gray-800">
                      {t("text-profile-information") === "Profile Information" ? "Profile Details" : t("text-profile-information")}
                    </span>
                  </div>
                  <IoChevronForwardOutline className="w-4 h-4 text-gray-400" />
                </Link>

                {/* My Orders */}
                <Link
                  href={ROUTES.ORDERS}
                  onClick={closeAccountMenu}
                  className="flex items-center justify-between py-4 px-3 hover:bg-gray-50 border-b border-gray-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <IoCubeOutline className="w-5 h-5 text-[#008755]" />
                    <span className="text-sm font-semibold text-gray-800">
                      {t("text-my-orders") === "MY ORDERS" ? "My Orders" : t("text-my-orders")}
                    </span>
                  </div>
                  <IoChevronForwardOutline className="w-4 h-4 text-gray-400" />
                </Link>

                {/* Wishlist / Favorites */}
                <Link
                  href={ROUTES.WISHLIST}
                  onClick={closeAccountMenu}
                  className="flex items-center justify-between py-4 px-3 hover:bg-gray-50 border-b border-gray-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <IoHeartOutline className="w-5 h-5 text-[#008755]" />
                    <span className="text-sm font-semibold text-gray-800">
                      {t("text-wishlist-favorites")}
                    </span>
                  </div>
                  <IoChevronForwardOutline className="w-4 h-4 text-gray-400" />
                </Link>

                {/* Manage Addresses */}
                <Link
                  href={ROUTES.ADDRESSES}
                  onClick={closeAccountMenu}
                  className="flex items-center justify-between py-4 px-3 hover:bg-gray-50 border-b border-gray-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <IoLocationOutline className="w-5 h-5 text-[#008755]" />
                    <span className="text-sm font-semibold text-gray-800">
                      {t("text-manage-addresses")}
                    </span>
                  </div>
                  <IoChevronForwardOutline className="w-4 h-4 text-gray-400" />
                </Link>

                {/* Change Password */}
                <Link
                  href={ROUTES.CHANGE_PASSWORD}
                  onClick={closeAccountMenu}
                  className="flex items-center justify-between py-4 px-3 hover:bg-gray-50 border-b border-gray-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <IoLockClosedOutline className="w-5 h-5 text-[#008755]" />
                    <span className="text-sm font-semibold text-gray-800">
                      {t("text-change-password")}
                    </span>
                  </div>
                  <IoChevronForwardOutline className="w-4 h-4 text-gray-400" />
                </Link>

                {/* Logout */}
                <button
                  onClick={() => {
                    closeAccountMenu();
                    logout();
                  }}
                  className="flex items-center gap-4 py-4 px-3 hover:bg-red-50 transition w-full text-left"
                >
                  <IoLogOutOutline className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-semibold text-gray-800">
                    {t("text-logout")}
                  </span>
                </button>
              </div>

              {/* Extra spacing at bottom to prevent overlap with bottom navigation bar */}
              <div className="h-16 w-full" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TODO: need to use just one drawer component */}
      <Drawer
        placement={dir === "rtl" ? "right" : "left"}
        open={displaySidebar}
        onClose={closeSidebar}
        styles={{
          wrapper: contentWrapperCSS,
        }}
        {...motionProps}
      >
        <MobileMenu />
      </Drawer>
    </>
  );
};

export default BottomNavigation;
