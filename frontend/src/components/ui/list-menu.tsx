import { useTranslation } from "next-i18next";
import Image from "next/image";
import { IoIosArrowForward } from "react-icons/io";
import Link from "./link";
import MegaMenu from "./mega-menu";
import cn from "classnames";

const ListMenu = ({
  dept,
  data,
  hasSubMenu,
  hasMegaMenu,
  hasBanners,
  menuIndex,
}: any) => {
  const { t } = useTranslation("menu");
  const label =
    typeof data?.label === "string" ? data.label : String(data?.label ?? "");
  const banners = Array.isArray(hasBanners) ? hasBanners : [];
  const showExtras = banners.length > 0;
  return (
    <li className={cn(!hasMegaMenu ? "group relative" : "")}>
      <Link
        href={data.path}
        className="flex items-center py-2 ltr:pl-5 rtl:pr-5 ltr:xl:pl-7 rtl:xl:pr-7 ltr:pr-3 rtl:pl-3 ltr:xl:pr-3.5 rtl:xl:pl-3.5 hover:text-heading hover:bg-gray-300"
      >
        {data.icon && (
          <span className="inline-flex ltr:mr-2 rtl:ml-2">{data.icon}</span>
        )}
        {t(label, { defaultValue: label })}
        {data.subMenu && (
          <span className="text-sm mt-0.5 shrink-0 ltr:ml-auto rtl:mr-auto">
            <IoIosArrowForward className="transform transition duration-300 ease-in-out text-body group-hover:text-black rtl:rotate-180" />
          </span>
        )}
      </Link>
      {hasSubMenu && (
        <SubMenu dept={dept} data={data.subMenu} menuIndex={menuIndex} />
      )}
      {(hasMegaMenu || showExtras) && (
        <div className="absolute flex bg-white categoryMegaMenu shadow-header w-[630px] xl:w-[1000px] 2xl:w-[1200px] ltr:left-full rtl:right-full">
          <div className="flex-shrink-0">
            {Array.isArray(hasMegaMenu) ? <MegaMenu columns={hasMegaMenu} /> : null}
          </div>
          {showExtras ? (
            <div className="hidden xl:block">
              {banners.length ? (
                <div className="grid grid-cols-2 gap-3 p-6 border-t border-gray-300 2xl:py-8 2xl:px-7 ">
                  {banners.map((banner: any) => (
                    <Link href={banner.path} key={banner.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="" src={banner.image.src} alt={banner.label} />
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
};

const SubMenu: React.FC<any> = ({ dept, data, menuIndex }) => {
  dept = dept + 1;
  return (
    <ul className="absolute z-30 invisible w-56 py-3 bg-gray-200 opacity-0 subMenuChild shadow-subMenu ltr:left-full rtl:right-full top-4">
      {data?.map((menu: any, index: number) => {
        const menuName: string = `sidebar-submenu-${dept}-${menuIndex}-${index}`;

        return (
          <ListMenu
            dept={dept}
            data={menu}
            hasSubMenu={menu.subMenu}
            menuName={menuName}
            key={menuName}
            menuIndex={index}
          />
        );
      })}
    </ul>
  );
};

export default ListMenu;
