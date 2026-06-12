import { Drawer } from '@components/common/drawer/drawer';
import FilterIcon from '@components/icons/filter-icon';
import Text from '@components/ui/text';
import { useUI } from '@contexts/ui.context';
import FilterSidebar from '@components/shop/filter-sidebar';
import ListBox from '@components/ui/list-box';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { getDirection } from '@utils/get-direction';
import motionProps from '@components/common/drawer/motion';
import { useProductsQuery } from "@framework/product/get-all-products";
import { useCategoriesQuery } from "@framework/category/get-all-categories";

const sortOptions = [
  { name: 'text-sorting-options', value: 'options' },
  { name: 'text-newest', value: 'newest' },
  { name: 'text-price-low-high', value: 'price_asc' },
  { name: 'text-price-high-low', value: 'price_desc' },
];

function findCategoryBySlug(categories: any[], slug: string): any {
  for (const cat of categories) {
    if (cat.slug === slug) return cat;
    if (Array.isArray(cat.children) && cat.children.length) {
      const found = findCategoryBySlug(cat.children, slug);
      if (found) return found;
    }
  }
  return null;
}

export default function SearchTopBar() {
  const { openFilter, displayFilter, closeFilter } = useUI();
  const { t } = useTranslation('common');
  const router = useRouter();
  const { query, locale } = router;
  const dir = getDirection(locale);

  const slug =
    typeof query?.slug === "string"
      ? query.slug
      : Array.isArray(query?.slug)
      ? query.slug[0]
      : undefined;
  const options: any = { ...query };
  if (slug && !options.category) {
    options.category = slug;
  }
  delete options.slug;

  const activeCategory = (options.category as string) || null;

  const { data } = useProductsQuery({ limit: 10, ...options });
  const totalItems = data?.pages?.[0]?.paginatorInfo?.total ?? 0;

  const { data: categoriesData } = useCategoriesQuery({ limit: 100 });
  const allCategories = categoriesData?.categories?.data ?? [];
  const matchedCategory = activeCategory
    ? findCategoryBySlug(allCategories, activeCategory)
    : null;

  const heading = matchedCategory?.name ?? t('text-our-products');

  return (
    <div className="flex justify-between items-center mb-7">
      <Text variant="pageHeading" className="hidden lg:inline-flex pb-1">
        {heading}
      </Text>
      <button
        className="lg:hidden text-heading text-sm px-4 py-2 font-semibold border border-gray-300 rounded-md flex items-center transition duration-200 ease-in-out focus:outline-none hover:bg-gray-200"
        onClick={openFilter}
      >
        <FilterIcon />
        <span className="ltr:pl-2.5 rtl:pr-2.5">{t('text-filters')}</span>
      </button>
      <div className="flex items-center justify-end">
        <div className="flex-shrink-0 text-body text-xs md:text-sm leading-4 ltr:pr-4 rtl:pl-4 ltr:md:mr-6 rtl:md:ml-6 ltr:pl-2 rtl:pr-2 hidden lg:block">
          {totalItems} {t('text-items')}
        </div>
        <ListBox options={sortOptions} />
      </div>
      {/* TODO: need to use just one drawer component */}
      <Drawer placement={dir === 'rtl' ? 'right' : 'left'} open={displayFilter} onClose={closeFilter} {...motionProps}>
        <FilterSidebar />
      </Drawer>
    </div>
  );
}

