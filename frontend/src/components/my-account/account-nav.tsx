import Link from "next/link";
import { useRouter } from "next/router";
import {
  IoBagOutline,
  IoPersonOutline,
  IoLocationOutline,
  IoSettingsOutline,
  IoHeartOutline,
  IoLogOutOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";
import { ROUTES } from "@utils/routes";
import { useLogoutMutation } from "@framework/auth/use-logout";
import { useTranslation } from "next-i18next";

export default function AccountNav({ customerName }: { customerName?: string | null }) {
  const { mutate: logout } = useLogoutMutation();
  const { pathname } = useRouter();
  const { t } = useTranslation("common");

  const normalizedPath = String(pathname || "").toLowerCase();
  const isActive = (slug: string) => {
    const s = String(slug || "").toLowerCase();
    if (s === "/my-account") return normalizedPath === "/my-account" || normalizedPath === "/my-account/index";
    if (s === "/my-account/orders") return normalizedPath.startsWith("/my-account/orders");
    return normalizedPath === s;
  };

  return (
    <nav className="w-full md:w-[260px] lg:w-[280px] flex-shrink-0 flex flex-col bg-white shadow-sm md:self-start md:min-h-[450px]">
      {/* User Greeting */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
          <IoPersonOutline className="w-5 h-5 text-[#008755]" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 font-body leading-tight">Hello,</span>
          <span className="text-sm font-semibold text-[#008755] font-body leading-tight">
            {customerName || "User"}
          </span>
        </div>
      </div>

      {/* MY ORDERS */}
      <div className="border-b border-gray-100">
        <Link
          href={ROUTES.ORDERS}
          className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <IoBagOutline className="w-5 h-5 text-[#008755]" />
            <span className="text-[13px] font-semibold uppercase tracking-wide text-[#008755] font-body">
              MY ORDERS
            </span>
          </div>
          <IoChevronForwardOutline className="w-4 h-4 text-gray-400" />
        </Link>
      </div>

      {/* ACCOUNT SETTINGS */}
      <div className="border-b border-gray-100">
        <div className="flex items-center gap-3 px-5 py-3.5">
          <IoSettingsOutline className="w-5 h-5 text-[#008755]" />
          <span className="text-[13px] font-semibold uppercase tracking-wide text-[#008755] font-body">
            ACCOUNT SETTINGS
          </span>
        </div>
        <div className="flex flex-col">
          <Link
            href={ROUTES.ACCOUNT_DETAILS}
            className={`relative flex items-center py-2.5 pl-14 pr-5 text-sm transition font-body ${
              isActive(ROUTES.ACCOUNT_DETAILS)
                ? "text-[#008755] font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#008755]"
                : "text-gray-700 hover:bg-gray-50 font-normal"
            }`}
          >
            Profile Information
          </Link>
          <Link
            href={ROUTES.ADDRESSES}
            className={`relative flex items-center py-2.5 pl-14 pr-5 text-sm transition font-body ${
              isActive(ROUTES.ADDRESSES)
                ? "text-[#008755] font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#008755]"
                : "text-gray-700 hover:bg-gray-50 font-normal"
            }`}
          >
            Manage Addresses
          </Link>
          <Link
            href={ROUTES.CHANGE_PASSWORD}
            className={`relative flex items-center py-2.5 pl-14 pr-5 text-sm transition font-body mb-2 ${
              isActive(ROUTES.CHANGE_PASSWORD)
                ? "text-[#008755] font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#008755]"
                : "text-gray-700 hover:bg-gray-50 font-normal"
            }`}
          >
            Change Password
          </Link>
        </div>
      </div>

      {/* MY STUFF */}
      <div className="border-b border-gray-100">
        <div className="flex items-center gap-3 px-5 py-3.5">
          <IoHeartOutline className="w-5 h-5 text-[#008755]" />
          <span className="text-[13px] font-semibold uppercase tracking-wide text-[#008755] font-body">
            MY STUFF
          </span>
        </div>
        <div className="flex flex-col">
          <Link
            href={ROUTES.WISHLIST}
            className={`relative flex items-center py-2.5 pl-14 pr-5 text-sm transition font-body mb-2 ${
              isActive(ROUTES.WISHLIST)
                ? "text-[#008755] font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#008755]"
                : "text-gray-700 hover:bg-gray-50 font-normal"
            }`}
          >
            Wishlist / Favorites
          </Link>
        </div>
      </div>

      {/* LOGOUT */}
      <div>
        <button
          type="button"
          className="flex items-center gap-3 w-full px-5 py-3.5 text-sm text-gray-700 hover:bg-red-50 transition font-body cursor-pointer"
          onClick={() => logout()}
        >
          <IoLogOutOutline className="w-5 h-5 text-red-400" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
