import Image from 'next/image';
import { useRouter } from 'next/router';
import { getDirection } from '@utils/get-direction';
import { useCategoriesQuery } from '@framework/category/get-all-categories';

interface CategoryBannerProps {
  className?: string;
}

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

const CategoryBanner: React.FC<CategoryBannerProps> = ({
  className = 'mb-7',
}) => {
  const { locale } = useRouter();
  const dir = getDirection(locale);
  const {
    query: { slug },
  } = useRouter();

  const { data: categoriesData } = useCategoriesQuery({ limit: 100 });
  const allCategories = categoriesData?.categories?.data ?? [];
  const slugStr = slug?.toString() ?? '';
  const matchedCategory = slugStr ? findCategoryBySlug(allCategories, slugStr) : null;

  // Fallback: convert slug to readable title (e.g. "gs-bags-pouches" → "Gs Bags Pouches")
  const fallbackTitle = slugStr
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const categoryTitle = matchedCategory?.name ?? fallbackTitle;

  return (
    <div
      className={`bg-gray-200 rounded-md relative flex flex-row ${className}`}
    >
      <div className="hidden md:flex">
        <Image
          src={
            dir === 'rtl'
              ? '/assets/images/category-banner-reverse.jpg'
              : '/assets/images/category-banner.jpg'
          }
          alt="Category Banner"
          width={1800}
          height={570}
          className="rounded-md"
        />
      </div>
      <div className="relative md:absolute top-0 ltr:left-0 rtl:right-0 h-auto md:h-full w-full md:w-2/5 flex items-center py-2 sm:py-3.5">
        <h2 className="capitalize text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-heading p-7 text-center w-full">
          {categoryTitle}
        </h2>
      </div>
    </div>
  );
};

export default CategoryBanner;

