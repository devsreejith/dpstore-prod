import Image from 'next/image';
import { useRouter } from 'next/router';
import { getDirection } from '@utils/get-direction';
import { useCategoriesQuery } from '@framework/category/get-all-categories';
import Link from "@components/ui/link";
import Container from "@components/ui/container";
import { useTranslation } from 'next-i18next';

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

  const { t } = useTranslation('common');
  const { t: tMenu } = useTranslation('menu');

  // Fallback: convert slug to readable title (e.g. "gs-bags-pouches" → "Gs Bags Pouches")
  const fallbackTitle = slugStr
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const getLocalizedCategoryName = (item: any) => {
    if (!item) return "";
    
    // 1. Check metadata
    const meta = item?.metadata ?? {};
    const currentLocale = locale || "en";
    if (currentLocale === "ar") {
      const arName = meta.name_ar || meta.nameAr || meta.ar || meta.ar_name || meta.arName;
      if (arName) return String(arName);
    } else {
      const enName = meta.name_en || meta.nameEn || meta.en || meta.en_name || meta.enName;
      if (enName) return String(enName);
    }

    // 2. Check JSON dictionary
    const key = item?.slug ? `menu-${item.slug}` : "";
    if (key) {
      const translated = tMenu(key);
      if (translated && translated !== key && !translated.startsWith("menu-")) {
        return translated;
      }
    }

    // 3. Fallback to name field
    return item.name || "";
  };

  const categoryTitle = matchedCategory ? getLocalizedCategoryName(matchedCategory) : fallbackTitle;

  return (
    <div
      className={`relative w-full overflow-hidden bg-cover bg-center ${className}`}
      style={{ backgroundImage: "url('/assets/images/product-header.webp')" }}
    >
      <div className="absolute inset-0 bg-[#005844]/40" />
      <Container>
        <div className="py-10 md:py-16 xl:py-20 w-full relative z-10 flex flex-col justify-center min-h-[250px] md:min-h-[300px]">
          {/* Breadcrumb */}
          <div className="flex items-center text-xs md:text-sm text-gray-200 mb-4 font-body gap-2">
            <Link href="/" className="hover:text-white transition">{t('breadcrumb-home')}</Link>
            <span className="opacity-70">&rsaquo;</span>
            <span className="text-white capitalize">{categoryTitle}</span>
          </div>

          {/* Title */}
          <h2 className="capitalize text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 font-body">
            {categoryTitle}
          </h2>

          {/* Description */}
          <p className="text-gray-200 text-xs md:text-sm max-w-xl font-body leading-relaxed">
            {t('category-page-description')}
          </p>
        </div>
      </Container>
    </div>
  );
};

export default CategoryBanner;

