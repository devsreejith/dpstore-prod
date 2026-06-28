import { useMemo, useState } from 'react';
import Link from '@components/ui/link';
import Scrollbar from '@components/common/scrollbar';
import { IoIosArrowDown } from 'react-icons/io';
import Logo from '@components/ui/logo';
import { useUI } from '@contexts/ui.context';
import { IoClose } from 'react-icons/io5';
import { useTranslation } from 'next-i18next';
import { useCategoriesQuery } from '@framework/category/get-all-categories';
import { ROUTES } from '@utils/routes';
import { useRouter } from 'next/router';

export default function MobileMenu() {
  const [activeMenus, setActiveMenus] = useState<any>([]);
  const { closeSidebar } = useUI();
  const { t } = useTranslation('menu');
  const { locale } = useRouter();
  const { data: categoriesData } = useCategoriesQuery({ limit: 100 });
  const handleArrowClick = (menuName: string) => {
    let newActiveMenus = [...activeMenus];

    if (newActiveMenus.includes(menuName)) {
      var index = newActiveMenus.indexOf(menuName);
      if (index > -1) {
        newActiveMenus.splice(index, 1);
      }
    } else {
      newActiveMenus.push(menuName);
    }

    setActiveMenus(newActiveMenus);
  };

  const ListMenu = ({
    dept,
    data,
    hasSubMenu,
    menuName,
    menuIndex,
    className = '',
  }: any) =>
    data.label && (
      <li className={`mb-0.5 ${className}`}>
        <div className="relative flex items-center justify-between">
          <Link
            href={data.path}
            className="w-full text-[15px] menu-item relative py-3 ltr:pl-5 rtl:pr-5 ltr:md:pl-6 rtl:md:pr-6 ltr:pr-4 rtl:pl-4 transition duration-300 ease-in-out"
          >
            <span className="block w-full" onClick={closeSidebar}>
              {t(String(data.label ?? ""), {
                defaultValue: String(data.label ?? ""),
              })}
            </span>
          </Link>
          {hasSubMenu && (
            <div
              className="absolute top-0 flex items-center justify-end w-full h-full text-lg cursor-pointer ltr:left-0 rtl:right-0 ltr:pr-5 rtl:pl-5"
              onClick={() => handleArrowClick(menuName)}
            >
              <IoIosArrowDown
                className={`transition duration-200 ease-in-out transform text-heading ${activeMenus.includes(menuName) ? '-rotate-180' : 'rotate-0'
                  }`}
              />
            </div>
          )}
        </div>
        {hasSubMenu && (
          <SubMenu
            dept={dept}
            data={data.subMenu}
            toggle={activeMenus.includes(menuName)}
            menuIndex={menuIndex}
          />
        )}
      </li>
    );

  const SubMenu = ({ dept, data, toggle, menuIndex }: any) => {
    if (!toggle) {
      return null;
    }

    dept = dept + 1;

    return (
      <ul className="pt-0.5">
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
              className={dept > 1 && 'ltr:pl-4 rtl:pr-4'}
            />
          );
        })}
      </ul>
    );
  };

  const mobileMenu = useMemo(() => {
    const getCategoryLabel = (cat: any) => {
      if (!cat) return "";
      
      // 1. Check if metadata contains localized name for current locale
      const meta = cat?.metadata ?? {};
      const currentLocale = locale || "en";
      
      if (currentLocale === "ar") {
        const arName = meta.name_ar || meta.nameAr || meta.ar || meta.ar_name || meta.arName;
        if (arName) return String(arName);
      } else {
        const enName = meta.name_en || meta.nameEn || meta.en || meta.en_name || meta.enName;
        if (enName) return String(enName);
      }

      // 2. Fallback to locales JSON dictionary lookup
      const key = cat?.slug ? `menu-${cat.slug}` : "";
      if (!key) return cat?.name || "";
      const translated = t(key);
      if (!translated || translated === key || translated.startsWith("menu-")) {
        return cat?.name || "";
      }
      return translated;
    };

    const categories = categoriesData?.categories?.data ?? [];
    const toMenuItem = (cat: any): any => ({
      id: cat?.id,
      path: `${ROUTES.CATEGORY}/${cat?.slug}`,
      label: getCategoryLabel(cat),
      ...(Array.isArray(cat?.children) && cat.children.length
        ? { subMenu: cat.children.map(toMenuItem) }
        : {}),
    });

    return [
      { id: 'home', path: ROUTES.HOME, label: 'menu-home' },
      ...categories.map(toMenuItem),
    ];
  }, [categoriesData, locale, t]);

  return (
    <>
      <div className="flex flex-col justify-between w-full h-full">
        <div className="w-full border-b border-gray-100 flex justify-between items-center relative ltr:pl-5 rtl:pr-5 ltr:md:pl-7 rtl:md:pr-7 flex-shrink-0 py-0.5">
          <Logo />

          <button
            className="flex items-center justify-center px-4 py-6 text-2xl text-gray-500 transition-opacity md:px-6 lg:py-8 focus:outline-none hover:opacity-60"
            onClick={closeSidebar}
            aria-label="close"
          >
            <IoClose className="text-black mt-1 md:mt-0.5" />
          </button>
        </div>

        <Scrollbar className="flex-grow mb-auto menu-scrollbar">
          <div className="flex flex-col px-0 py-7 lg:px-2 text-heading">
            <ul className="mobileMenu">
              {mobileMenu.map((menu, index) => {
                const dept: number = 1;
                const menuName: string = `sidebar-menu-${dept}-${index}`;

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
          </div>
        </Scrollbar>
      </div>
    </>
  );
}
