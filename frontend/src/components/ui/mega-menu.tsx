import React from 'react';
import Link from '@components/ui/link';
import { useTranslation } from 'next-i18next';

interface MenuItem {
  id: number | string;
  path: string;
  label: string;
  columnItemItems?: MenuItem[];
}
type MegaMenuProps = {
  columns: {
    id: number | string;
    columnItems: MenuItem[];
  }[];
};

const MegaMenu: React.FC<MegaMenuProps> = ({ columns }) => {
  const { t } = useTranslation('menu');
  const colCount = Array.isArray(columns) && columns.length ? columns.length : 1;
  return (
    <div className="absolute bg-gray-200 megaMenu shadow-header ltr:-left-28 rtl:-right-28 ltr:xl:left-0 rtl:xl:right-0">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {columns?.map((column) => (
          <ul
            className="pt-6 even:bg-gray-150 pb-7 2xl:pb-8 2xl:pt-7"
            key={column.id}
          >
            {column?.columnItems?.map((columnItem) => (
              <React.Fragment key={columnItem.id}>
                {String(columnItem.label ?? "").trim() ? (
                  <li className="mb-1.5">
                    <Link
                      href={columnItem.path}
                      className="block text-sm py-1.5 text-heading font-semibold px-5 xl:px-8 2xl:px-10 hover:text-heading hover:bg-gray-300"
                    >
                      {t(String(columnItem.label ?? ''), {
                        defaultValue: String(columnItem.label ?? ''),
                      })}
                    </Link>
                  </li>
                ) : null}
                {columnItem?.columnItemItems?.map((item: any) => (
                  <li
                    key={item.id}
                    className={
                      columnItem?.columnItemItems?.length === item.id
                        ? 'border-b border-gray-300 pb-3.5 mb-3'
                        : ''
                    }
                  >
                    <Link
                      href={item.path}
                      className="text-body text-sm block py-1.5 px-5 xl:px-8 2xl:px-10 hover:text-heading hover:bg-gray-300"
                    >
                      {t(String(item.label ?? ''), {
                        defaultValue: String(item.label ?? ''),
                      })}
                    </Link>
                  </li>
                ))}
              </React.Fragment>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
};

export default MegaMenu;
