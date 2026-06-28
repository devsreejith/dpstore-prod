import { useCategoriesQuery } from "@framework/category/get-all-categories";
import Loader from "@components/ui/loader";
import { CheckBox } from "@components/ui/checkbox";
import { useRouter } from "next/router";
import React from "react";
import { useTranslation } from "next-i18next";

export const CategoryFilter = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { pathname, query } = router;
  const { data, isLoading } = useCategoriesQuery({
    limit: 100,
  });

  const selectedCategories = query?.category
    ? (query.category as string).split(",")
    : [];
  const [formState, setFormState] =
    React.useState<string[]>(selectedCategories);

  React.useEffect(() => {
    setFormState(selectedCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query?.category]);

  if (isLoading) return <Loader size="small" text="Loading..." />;

  function handleItemClick(e: React.FormEvent<HTMLInputElement>): void {
    const { value } = e.currentTarget;
    let currentFormState = formState.includes(value)
      ? formState.filter((i) => i !== value)
      : [...formState, value];
    const { category, ...restQuery } = query;
    router.push(
      {
        pathname,
        query: {
          ...restQuery,
          ...(!!currentFormState.length
            ? { category: currentFormState.join(",") }
            : {}),
        },
      },
      undefined,
      { scroll: false }
    );
  }
  const { t: tMenu } = useTranslation("menu");
  const getLocalizedName = (item: any) => {
    if (!item) return "";
    
    // 1. Check metadata
    const meta = item?.metadata ?? {};
    const currentLocale = router.locale || "en";
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

  const items = data?.categories.data;
  return (
    <div className="block border-b border-gray-300 pb-7 mb-7">
      <h3 className="text-heading text-sm md:text-base font-semibold mb-7">
        {t("text-category")}
      </h3>
      <div className="mt-2 flex flex-col space-y-4">
        {items?.map((item: any) => {
          const localizedName = getLocalizedName(item);
          return (
            <CheckBox
              key={item.id}
              label={localizedName}
              name={localizedName.toLowerCase()}
              checked={formState.includes(item.slug)}
              value={item.slug}
              onChange={handleItemClick}
            />
          );
        })}
      </div>
    </div>
  );
};
