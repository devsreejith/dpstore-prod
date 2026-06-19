import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import HeaderMenu from "@components/layout/header/header-menu";
import Logo from "@components/ui/logo";
import Link from "@components/ui/link";
import { useUI } from "@contexts/ui.context";
import { ROUTES } from "@utils/routes";
import { useAddActiveScroll } from "@utils/use-add-active-scroll";
import dynamic from "next/dynamic";
import { useTranslation } from "next-i18next";
import WishButton from "@components/ui/wish-button";
import CategoryMenu from "@components/ui/category-menu";
import { useCategoriesQuery } from "@framework/category/get-all-categories";
import Image from "next/image";
import { useLogoutMutation } from "@framework/auth/use-logout";
import { useQuery } from "@tanstack/react-query";
import http from "@framework/utils/http";
import { siteSettings } from "@settings/site-settings";
import {
  IoGameControllerOutline,
  IoGiftOutline,
  IoShirtOutline,
  IoShieldOutline,
  IoPersonOutline,
  IoBagOutline,
  IoSettingsOutline,
  IoLogOutOutline,
  IoSearchOutline,
  IoCloseOutline,
} from "react-icons/io5";

const AuthMenu = dynamic(() => import("@components/layout/header/auth-menu"), {
  ssr: false,
});
const CartButton = dynamic(() => import("@components/cart/cart-button"), {
  ssr: false,
});

const { site_header } = siteSettings;

export default function Header() {
  const { openSidebar, setDrawerView, openModal, setModalView, isAuthorized } =
    useUI();
  const { t } = useTranslation(["common", "forms"]);
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();
  const { data: categoriesData } = useCategoriesQuery({ limit: 100 });
  const siteHeaderRef = useRef<HTMLDivElement>(null);
  useAddActiveScroll(siteHeaderRef);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (router.isReady) {
      setSearchTerm(typeof router.query.q === "string" ? router.query.q : "");
    }
  }, [router.isReady, router.query.q]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { q, ...restQuery } = router.query;
    if (searchTerm.trim()) {
      router.push({
        pathname: ROUTES.SEARCH,
        query: { ...restQuery, q: searchTerm.trim() },
      });
    } else {
      router.push({
        pathname: ROUTES.SEARCH,
        query: restQuery,
      });
    }
  }
  
  const activeQuery = typeof router.query.q === "string" ? router.query.q : "";
  const isSearchCompleted = !!activeQuery && searchTerm === activeQuery;

  function handleSearchButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (isSearchCompleted) {
      e.preventDefault();
      setSearchTerm("");
      const { q, ...restQuery } = router.query;
      router.push({
        pathname: ROUTES.SEARCH,
        query: restQuery,
      }, undefined, { scroll: false });
    }
  }

  // Fetch logged in customer profile to show customer name dynamically in the header dropdown
  const customerQuery = useQuery({
    queryKey: ["store.customer.me.header"],
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
    if (first) return first;
    const email = String(c?.email ?? "").trim();
    if (email) return email.split("@")[0] || email;
    return "My Account";
  })();

  const getMenuLabel = (label: string) => {
    const fallback: Record<string, string> = {
      "menu-deals-today": "Deals Today",
      "menu-offers": "Offers",
      "menu-faq": "FAQ",
      "menu-contact": "Contact"
    };
    return t(`menu:${label}`) || fallback[label] || label;
  };

  function handleLogin() {
    setModalView("LOGIN_VIEW");
    return openModal();
  }
  function handleMobileMenu() {
    setDrawerView("MOBILE_MENU");
    return openSidebar();
  }

  const categoryMenu = useMemo(() => {
    const categories = categoriesData?.categories?.data ?? [];

    const getRootIcon = (cat: any): React.ReactNode | undefined => {
      const slug = String(cat?.slug ?? "").toLowerCase();
      const name = String(cat?.name ?? "").toLowerCase();
      const key = slug || name;
      if (key.includes("gift") || key.includes("souvenir")) return <IoGiftOutline />;
      if (key.includes("apparel") || key.includes("uniform") || key.includes("cloth"))
        return <IoShirtOutline />;
      if (key.includes("toy") || key.includes("game")) return <IoGameControllerOutline />;
      if (key.includes("swat")) return <IoShieldOutline />;
      return undefined;
    };

    const toNavMenuItem = (cat: any): any => ({
      id: cat?.id,
      path: `${ROUTES.CATEGORY}/${cat?.slug}`,
      label: cat?.name,
      ...(Array.isArray(cat?.children) && cat.children.length
        ? { subMenu: cat.children.map(toNavMenuItem) }
        : {}),
    });

    const buildColumns = (rootCat: any) => {
      const level2: any[] = Array.isArray(rootCat?.children) ? rootCat.children : [];
      if (!level2.length) return undefined;

      const maxCols = 3;
      const withChildren = level2.filter(
        (l2) => Array.isArray(l2?.children) && l2.children.length
      );
      const leaves = level2.filter(
        (l2) => !Array.isArray(l2?.children) || l2.children.length === 0
      );

      const reserveLeafCol = leaves.length > 0;
      const groupCols = withChildren.length
        ? Math.min(reserveLeafCol ? Math.max(1, maxCols - 1) : maxCols, withChildren.length)
        : 0;
      const totalCols = Math.max(1, groupCols + (reserveLeafCol ? 1 : 0));

      const cols: any[] = Array.from({ length: totalCols }).map((_, idx) => ({
        id: `${rootCat?.id ?? "root"}-col-${idx}`,
        columnItems: [],
      }));

      withChildren.forEach((l2, idx) => {
        const level3: any[] = Array.isArray(l2?.children) ? l2.children : [];
        const heading = {
          id: l2?.id,
          path: `${ROUTES.CATEGORY}/${l2?.slug}`,
          label: l2?.name,
          columnItemItems: level3.map((l3) => ({
            id: l3?.id,
            path: `${ROUTES.CATEGORY}/${l3?.slug}`,
            label: l3?.name,
          })),
        };

        const target = groupCols > 0 ? idx % groupCols : 0;
        cols[target].columnItems.push(heading);
      });

      if (reserveLeafCol) {
        const leafHeadings = leaves.map((l2) => ({
          id: l2?.id,
          path: `${ROUTES.CATEGORY}/${l2?.slug}`,
          label: l2?.name,
        }));

        cols[totalCols - 1].columnItems.push(...leafHeadings);
      }

      return cols;
    };

    const toDropdownMenuItem = (rootCat: any): any => {
      const iconSrc: string | undefined =
        rootCat?.image?.thumbnail ||
        rootCat?.image?.original ||
        rootCat?.icon ||
        undefined;
      const rootIcon = getRootIcon(rootCat);
      const columns = buildColumns(rootCat);

      return {
        id: rootCat?.id,
        path: `${ROUTES.CATEGORY}/${rootCat?.slug}`,
        label: rootCat?.name,
        ...(rootIcon
          ? { icon: <span className="text-lg text-heading">{rootIcon}</span> }
          : iconSrc
          ? {
              icon: (
                <Image
                  src={iconSrc}
                  width={18}
                  height={18}
                  alt={String(rootCat?.name ?? "Category")}
                />
              ),
            }
          : {}),
        ...(columns ? { columns } : {}),
      };
    };

    return {
      dropdown: categories.map(toDropdownMenuItem),
      nav: categories.map(toNavMenuItem),
    };
  }, [categoriesData]);

  const headerMenu = useMemo(() => {
    const items = (categoryMenu as any)?.nav?.map((c: any) => ({
      id: c.id,
      path: c.path,
      label: c.label,
      ...(c.subMenu ? { subMenu: c.subMenu } : {}),
    }));

    return [
      { id: "home", path: ROUTES.HOME, label: "Home" },
      ...items,
    ];
  }, [categoryMenu]);

  return (
    <header
      id="siteHeader"
      ref={siteHeaderRef}
      className="relative z-20 w-full h-16 sm:h-20 lg:h-36 xl:h-40 headerThree"
    >
      <div className="fixed z-20 w-full h-16 px-4 text-gray-700 transition duration-200 ease-in-out bg-white innerSticky body-font sm:h-20 lg:h-36 xl:h-40 ltr:pl-4 rtl:pr-4 ltr:md:pl-0 rtl:md:pr-0 ltr:lg:pl-6 rtl:lg:pr-6 ltr:pr-4 ltr:lg:pr-6 rtl:pl-4 rtl:lg:pl-6 md:px-8 2xl:px-16">
        <div className="flex items-center justify-center mx-auto max-w-[1920px] h-full lg:h-20 xl:h-24 w-full relative before:absolute before:w-screen before:h-px before:bg-[#F1F1F1] before:bottom-0">
          <button
            aria-label="Menu"
            className="flex-col items-center justify-center flex-shrink-0 hidden h-full px-5 outline-none menuBtn md:flex lg:hidden 2xl:px-7 focus:outline-none"
            onClick={handleMobileMenu}
          >
            <span className="menuIcon">
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
            </span>
          </button>
          
          <div className="flex items-center ltr:2xl:mr-12 rtl:2xl:ml-12 ltr:3xl:mr-20 rtl:3xl:ml-20">
            <Logo />
            {/* Pages Menu block next to Logo */}
            <div className="hidden transition-all duration-100 ease-in-out lg:flex ltr:ml-7 rtl:mr-7 ltr:xl:ml-9 rtl:xl:mr-9 ltr:pr-2 rtl:pl-2 headerTopMenu">
              {site_header.pagesMenu?.map((item: any) => (
                <Link
                  href={item.path}
                  className="relative flex items-center px-3 lg:px-2.5 py-0 text-sm font-normal xl:text-base text-heading xl:px-6 hover:text-black font-body transition-colors"
                  key={`pages-menu-${item.id}`}
                >
                  {getMenuLabel(item.label)}
                  {item.icon && (
                    <span className="ltr:ml-1.5 rtl:mr-1.5 ltr:xl:ml-2 rtl:xl:mr-2">
                      {item.icon}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative hidden w-2/6 ltr:mr-auto rtl:ml-auto lg:block">
            <form
              onSubmit={handleSearchSubmit}
              className="relative w-full overflow-hidden rounded-md bg-borderBottom"
              noValidate
              role="search"
            >
              <label htmlFor="search" className="flex items-center">
                <button
                  type={isSearchCompleted ? "button" : "submit"}
                  onClick={handleSearchButtonClick}
                  className="absolute top-0 ltr:right-0 rtl:left-0 flex items-center justify-center flex-shrink-0 w-12 h-full cursor-pointer md:w-14 focus:outline-none text-heading hover:bg-heading hover:text-white transition-all duration-200"
                >
                  {isSearchCompleted ? (
                    <IoCloseOutline className="w-6 h-6" />
                  ) : (
                    <IoSearchOutline className="w-5 h-5" />
                  )}
                </button>
                <input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchTerm(val);
                    if (!val.trim() && router.pathname === ROUTES.SEARCH) {
                      const { q, ...restQuery } = router.query;
                      router.push({
                        pathname: ROUTES.SEARCH,
                        query: restQuery,
                      }, undefined, { scroll: false });
                    }
                  }}
                  className="w-full text-sm placeholder-gray-400 bg-transparent rounded-md outline-none focus:border-2 focus:border-gray-600 ltr:pl-4 rtl:pr-4 ltr:pr-14 rtl:pl-14 h-14 text-heading lg:text-base"
                  placeholder={t("forms:placeholder-search")}
                  aria-label="Search"
                  autoComplete="off"
                />
              </label>
            </form>
          </div>
          <div className="flex flex-shrink-0 transition-all duration-200 ease-in-out transform ltr:ml-auto rtl:mr-auto ltr:mr-3 rtl:ml-3 ltr:lg:mr-5 rtl:lg:ml-5 ltr:xl:mr-8 rtl:xl:ml-8 ltr:2xl:mr-10 rtl:2xl:ml-10 languageSwitcher lg:hidden">
            {/* <LanguageSwitcher /> */}
          </div>
          <div className="flex items-center justify-end flex-shrink-0">
            <div className="flex items-center transition-all wishlistShopping gap-x-7 lg:gap-x-6 xl:gap-x-8 2xl:gap-x-10 ltr:pl-3 rtl:pr-3">
              <Link href={ROUTES.WISHLIST} className="flex md:gap-x-4 align-center group">
                <WishButton />
                <span className="hidden text-sm font-semibold transition-all duration-100 ease-in-out cursor-pointer lg:font-normal lg:block xl:text-base text-heading group-hover:text-black">
                  {t("menu:menu-wishlist")}
                </span>
              </Link>
              <div className="hidden lg:flex md:gap-x-4 align-center">
                <CartButton />
                <span className="hidden text-sm font-semibold transition-all duration-100 ease-in-out cursor-pointer lg:font-normal lg:block xl:text-base text-heading">
                  {t("menu:menu-shopping")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="items-center hidden lg:flex lg:h-16 headerBottom mx-auto max-w-[1920px]">
          <div className="flex items-center">
            <CategoryMenu
              className="hidden lg:block"
              categoryMenu={(categoryMenu as any)?.dropdown ?? []}
            />
            <HeaderMenu
              data={headerMenu}
              className="hidden lg:flex ltr:pl-3.5 rtl:pr-3.5 ltr:xl:pl-5 rtl:xl:pr-5 "
            />
          </div>

          <div className="flex items-center flex-shrink-0 ltr:ml-auto rtl:mr-auto gap-x-7">
            {isAuthorized ? (
              /* Polished Profile Dropdown Menu for Logged In Customer */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-x-2 text-sm xl:text-base font-normal text-heading focus:outline-none py-2 px-3 hover:bg-gray-50 rounded-lg transition font-body"
                >
                  <IoPersonOutline className="w-4 xl:w-[17px] h-auto text-black" />
                  <span>{customerName}</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                      dropdownOpen ? "transform rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2.5 w-52 bg-white border border-gray-150 rounded-xl shadow-lg py-2.5 z-40 animate-fade-in origin-top-right font-body">
                      <Link
                        href={ROUTES.ACCOUNT_DETAILS}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-heading hover:bg-[#E8F5E9] hover:text-[#005844] font-normal transition"
                      >
                        <IoPersonOutline className="text-lg text-gray-400" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        href={ROUTES.ORDERS}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-heading hover:bg-[#E8F5E9] hover:text-[#005844] font-normal transition"
                      >
                        <IoBagOutline className="text-lg text-gray-400" />
                        <span>{t("menu:menu-shopping")}</span>
                      </Link>
                      <Link
                        href={ROUTES.CHANGE_PASSWORD}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-heading hover:bg-[#E8F5E9] hover:text-[#005844] font-normal transition"
                      >
                        <IoSettingsOutline className="text-lg text-gray-400" />
                        <span>Settings</span>
                      </Link>
                      <div className="border-t border-gray-100 my-1.5" />
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        disabled={isLoggingOut}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-normal transition w-full text-left"
                      >
                        <IoLogOutOutline className="text-lg text-red-500" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <AuthMenu
                isAuthorized={isAuthorized}
                href={ROUTES.ACCOUNT}
                className="flex-shrink-0 hidden text-sm xl:text-base lg:flex focus:outline-none text-heading gap-x-3"
                btnProps={{
                  children: (
                    <>
                      <IoPersonOutline className="w-4 xl:w-[17px] h-auto text-black" />
                      {t("text-login")}
                    </>
                  ),
                  onClick: handleLogin,
                }}
              />
            )}
            {/* <LanguageSwitcher /> */}
          </div>
        </div>
      </div>
    </header>
  );
}
