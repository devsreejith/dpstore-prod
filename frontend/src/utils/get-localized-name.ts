export function getLocalizedName(item: any, locale: string | undefined, fallbackNameKey: string = 'name') {
  if (!item) return "";

  const currentLocale = locale || "en";
  const meta = item.metadata || {};

  if (currentLocale === "ar") {
    const arName = meta.name_ar || meta.nameAr || meta.ar || meta.ar_name || meta.arName || 
                   meta.title_ar || meta.titleAr || meta.ar_title || meta.arTitle ||
                   item.name_ar || item.nameAr || item.title_ar || item.titleAr;
    if (arName) return String(arName);
  } else {
    const enName = meta.name_en || meta.nameEn || meta.en || meta.en_name || meta.enName ||
                   meta.title_en || meta.titleEn || meta.en_title || meta.enTitle ||
                   item.name_en || item.nameEn || item.title_en || item.titleEn;
    if (enName) return String(enName);
  }

  // Fallback to the main title/name fields on the item itself
  return item[fallbackNameKey] || item.name || item.title || "";
}

export function getLocalizedDescription(item: any, locale: string | undefined, fallbackDescKey: string = 'description') {
  if (!item) return "";

  const currentLocale = locale || "en";
  const meta = item.metadata || {};

  if (currentLocale === "ar") {
    const arDesc = meta.description_ar || meta.descriptionAr || meta.ar_description || meta.arDescription ||
                   item.description_ar || item.descriptionAr;
    if (arDesc) return String(arDesc);
  } else {
    const enDesc = meta.description_en || meta.descriptionEn || meta.en_description || meta.enDescription ||
                   item.description_en || item.descriptionEn;
    if (enDesc) return String(enDesc);
  }

  return item[fallbackDescKey] || item.description || "";
}
