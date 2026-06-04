import Link from "next/link";
import { useRouter } from "next/router";
import {
  IoHomeOutline,
  IoCartOutline,
  IoPersonOutline,
  IoLocationOutline,
  IoSettingsOutline,
  IoHeartOutline,
  IoLogOutOutline,
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
    <nav className="w-full md:w-[260px] lg:w-[280px] flex-shrink-0 flex flex-col gap-4">
      {/* Structured Navigation Categories - Borderless & Shadowless List */}
      <div className="flex flex-col gap-2">
        {/* Section: MY ORDERS */}
        <div className="flex flex-col">
          <div className="px-4 pt-3 pb-1 text-gray-400 font-semibold uppercase text-[10px] tracking-wider font-body">
            MY ORDERS
          </div>
          <Link
            href={ROUTES.ORDERS}
            className={`flex items-center gap-3.5 py-2.5 px-4 transition rounded-md font-body ${
              isActive(ROUTES.ORDERS)
                ? "bg-gray-100 text-heading font-medium"
                : "text-body hover:text-heading hover:bg-gray-50 font-normal"
            }`}
          >
            <IoCartOutline className="w-5 h-5 text-gray-500" />
            <span className="text-sm">Orders</span>
          </Link>
        </div>

        {/* Section: ACCOUNT SETTINGS */}
        <div className="flex flex-col gap-0.5">
          <div className="px-4 pt-3 pb-1 text-gray-400 font-semibold uppercase text-[10px] tracking-wider font-body">
            ACCOUNT SETTINGS
          </div>
          <Link
            href={ROUTES.ACCOUNT_DETAILS}
            className={`flex items-center gap-3.5 py-2.5 px-4 transition rounded-md font-body ${
              isActive(ROUTES.ACCOUNT_DETAILS)
                ? "bg-gray-100 text-heading font-medium"
                : "text-body hover:text-heading hover:bg-gray-50 font-normal"
            }`}
          >
            <IoPersonOutline className="w-5 h-5 text-gray-500" />
            <span className="text-sm">Profile Information</span>
          </Link>
          <Link
            href={ROUTES.ADDRESSES}
            className={`flex items-center gap-3.5 py-2.5 px-4 transition rounded-md font-body ${
              isActive(ROUTES.ADDRESSES)
                ? "bg-gray-100 text-heading font-medium"
                : "text-body hover:text-heading hover:bg-gray-50 font-normal"
            }`}
          >
            <IoLocationOutline className="w-5 h-5 text-gray-500" />
            <span className="text-sm">Manage Addresses</span>
          </Link>
          <Link
            href={ROUTES.CHANGE_PASSWORD}
            className={`flex items-center gap-3.5 py-2.5 px-4 transition rounded-md font-body ${
              isActive(ROUTES.CHANGE_PASSWORD)
                ? "bg-gray-100 text-heading font-medium"
                : "text-body hover:text-heading hover:bg-gray-50 font-normal"
            }`}
          >
            <IoSettingsOutline className="w-5 h-5 text-gray-500" />
            <span className="text-sm">Change Password</span>
          </Link>
        </div>

        {/* Section: MY STUFF */}
        <div className="flex flex-col">
          <div className="px-4 pt-3 pb-1 text-gray-400 font-semibold uppercase text-[10px] tracking-wider font-body">
            MY STUFF
          </div>
          <Link
            href={ROUTES.WISHLIST}
            className={`flex items-center gap-3.5 py-2.5 px-4 transition rounded-md font-body ${
              isActive(ROUTES.WISHLIST)
                ? "bg-gray-100 text-heading font-medium"
                : "text-body hover:text-heading hover:bg-gray-50 font-normal"
            }`}
          >
            <IoHeartOutline className="w-5 h-5 text-gray-500" />
            <span className="text-sm">Wishlist / Favorites</span>
          </Link>
        </div>

        {/* Section: LOGOUT */}
        <button
          type="button"
          className="flex items-center gap-3.5 cursor-pointer text-sm font-normal py-2.5 px-4 text-heading hover:bg-red-50 hover:text-red-600 transition rounded-md text-left w-full mt-3 border-t border-gray-100 pt-3.5 font-body"
          onClick={() => logout()}
        >
          <IoLogOutOutline className="w-5 h-5 text-red-500" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
