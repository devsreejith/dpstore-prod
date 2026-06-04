import { z } from "zod"

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const ProductListQuerySchema = PaginationSchema.extend({
  q: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1).max(200).optional()
  ),
  category: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1).max(200).optional()
  ),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  in_stock: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional(),
  sort: z
    .enum(["newest", "oldest", "price_asc", "price_desc", "name_asc", "name_desc"])
    .optional(),
  featured: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional(),
  price: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1).max(200).optional()
  ),
  related_to: z.string().trim().min(1).max(200).optional(),
  handle: z.string().trim().optional(),
  collection_id: z.union([z.string(), z.array(z.string())]).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  region_id: z.string().trim().optional(),
})

export type FrontendAttachment = {
  id: string | number
  thumbnail: string
  original: string
}

export type FrontendTag = {
  id: string | number
  name: string
  slug: string
}

export type FrontendCategory = {
  id: string | number
  name: string
  slug: string
  details?: string
  image?: FrontendAttachment
  icon?: string
  products?: FrontendProduct[]
  productCount?: number
}

export type FrontendProductVariation = {
  id: string | number
  value: string
  meta?: string
  attribute: {
    id: string | number
    name: string
    slug: string
  }
}

export type FrontendProduct = {
  id: string | number
  name: string
  slug: string
  price: number
  quantity: number
  sale_price?: number
  image: FrontendAttachment
  sku?: string
  gallery?: FrontendAttachment[]
  category?: FrontendCategory
  tag?: FrontendTag[]
  tags?: FrontendTag[]
  meta?: unknown[]
  description?: string
  variations?: FrontendProductVariation[]
  isNewArrival?: boolean
  [key: string]: unknown
}

export function toAttachment(
  url: string,
  id: string | number = 1
): FrontendAttachment {
  return {
    id,
    thumbnail: url,
    original: url,
  }
}

function ensureAbsoluteAssetUrl(url: string | undefined | null) {
  if (!url) return undefined
  const trimmed = String(url).trim()
  if (!trimmed) return undefined

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      const host = parsed.hostname.toLowerCase()
      const isLocal =
        host === "localhost" || host === "127.0.0.1" || host === "::1"
      if (isLocal && (parsed.pathname.startsWith("/static/") || parsed.pathname.startsWith("/uploads/"))) {
        return `${parsed.pathname}${parsed.search}`
      }
    } catch {}
    return trimmed
  }

  if (trimmed.startsWith("/uploads/")) return trimmed
  if (trimmed.startsWith("/static/")) return trimmed

  const base =
    (process.env.PUBLIC_BACKEND_URL || process.env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "")

  if (base && trimmed.startsWith("/")) return `${base}${trimmed}`

  return trimmed
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function selectVariantPrice(variant: any, currencyCode: string): number | undefined {
  const prices = Array.isArray(variant?.prices) ? variant.prices : []
  const byCurrency =
    prices.find((p: any) => p?.currency_code === currencyCode) ??
    prices.find((p: any) => p?.currencyCode === currencyCode)
  const candidate = byCurrency ?? prices[0]
  const amount = candidate?.amount ?? candidate?.value
  const n = safeNumber(amount, NaN)
  return Number.isFinite(n) ? n : undefined
}

export function mapMedusaProductToFrontend(product: any, opts?: {
  currencyCode?: string
}): FrontendProduct {
  const currencyCode = (opts?.currencyCode ?? process.env.DEFAULT_CURRENCY_CODE ?? "aed")
    .toLowerCase()
  const images = Array.isArray(product?.images) ? product.images : []
  const thumbnail =
    ensureAbsoluteAssetUrl(product?.thumbnail) ??
    ensureAbsoluteAssetUrl(images?.[0]?.url) ??
    ""

  const variants = Array.isArray(product?.variants) ? product.variants : []
  const prices = variants
    .map((v: any) => selectVariantPrice(v, currencyCode))
    .filter((p: any) => typeof p === "number") as number[]
  const priceFromVariants = prices.length ? Math.min(...prices) : undefined

  const metadata = product?.metadata ?? {}
  const price = priceFromVariants ?? safeNumber(metadata?.price, 0)
  const sale_price =
    metadata?.sale_price !== undefined ? safeNumber(metadata.sale_price, 0) : undefined

  const item_code = String(
    metadata?.item_code ?? variants?.[0]?.sku ?? metadata?.sku ?? ""
  ).trim()

  const collectionTitle = String(product?.collection?.title ?? "").trim()

  const quantity = variants
    .map((v: any) => {
      if (v?.manage_inventory === false) return 999999
      return safeNumber(v?.inventory_quantity, 0)
    })
    .reduce((sum: number, q: number) => sum + q, 0)

  const gallery = images
    .map((img: any, idx: number) => ensureAbsoluteAssetUrl(img?.url))
    .filter(Boolean)
    .map((url: any, idx: number) => toAttachment(url, idx + 1))

  const options = Array.isArray(product?.options) ? product.options : []
  const variations: FrontendProductVariation[] = []
  let variationId = 1
  for (const option of options) {
    const name = String(option?.title ?? option?.name ?? "").trim()
    if (!name) continue
    const slug = name.toLowerCase().replace(/\s+/g, "-")
    const values = Array.isArray(option?.values) ? option.values : []
    for (const v of values) {
      const value = String(v?.value ?? v ?? "").trim()
      if (!value) continue
      variations.push({
        id: variationId++,
        value,
        meta: String(v?.metadata?.hex ?? v?.meta ?? value),
        attribute: {
          id: option?.id ?? slug,
          name,
          slug,
        },
      })
    }
  }

  const tags = Array.isArray(product?.tags) ? product.tags : []
  const metaTags = Array.isArray(metadata?.tags) ? metadata.tags : []
  const tagValues = [
    ...tags.map((t: any) => String(t?.value ?? t?.name ?? "").trim()),
    ...metaTags.map((t: any) => String(t ?? "").trim()),
  ]
  const mappedTags: FrontendTag[] = tagValues
    .filter(Boolean)
    .map((value: string) => ({
      id: value,
      name: value,
      slug: value.toLowerCase().replace(/\s+/g, "-"),
    }))

  const categories = Array.isArray(product?.categories) ? product.categories : []
  const primaryCategory = categories?.[0]
  const mappedCategory = primaryCategory
    ? mapMedusaCategoryToFrontend(primaryCategory)
    : undefined

  return {
    id: product?.id ?? product?.handle ?? product?.title ?? "",
    name: String(product?.title ?? product?.name ?? ""),
    slug: String(product?.handle ?? product?.slug ?? ""),
    price,
    quantity,
    variant_id: product?.variants?.[0]?.id,
    ...(sale_price !== undefined ? { sale_price } : {}),
    image: toAttachment(thumbnail, 1),
    sku: item_code,
    ...(gallery.length ? { gallery } : {}),
    ...(mappedCategory ? { category: mappedCategory } : {}),
    ...(mappedTags.length ? { tags: mappedTags } : {}),
    description: product?.description ?? "",
    variations: variations.length ? variations : undefined,
    isNewArrival: metadata?.isNewArrival === true,
    ...(item_code ? { item_code } : {}),
    ...(collectionTitle ? { range: collectionTitle } : {}),
    created_at: product?.created_at,
  }
}

function getCategoryProductCount(category: any): number {
  const seenProductIds = new Set<string>();
  const collect = (cat: any) => {
    const products = Array.isArray(cat?.products) ? cat.products : [];
    for (const p of products) {
      if (p?.id) seenProductIds.add(String(p.id));
    }
    const children = Array.isArray(cat?.category_children) ? cat.category_children : [];
    for (const child of children) {
      collect(child);
    }
  };
  collect(category);
  return seenProductIds.size;
}

export function mapMedusaCategoryToFrontend(category: any): FrontendCategory {
  const metadata = category?.metadata ?? {}
  const imageUrl = ensureAbsoluteAssetUrl(metadata?.image?.original ?? metadata?.image)
  const iconUrl = ensureAbsoluteAssetUrl(metadata?.icon)

  return {
    id: category?.id ?? category?.handle ?? "",
    name: String(category?.name ?? ""),
    slug: String(category?.handle ?? category?.slug ?? ""),
    details: category?.description ?? "",
    ...(imageUrl ? { image: toAttachment(imageUrl, 1) } : {}),
    ...(iconUrl ? { icon: iconUrl } : {}),
    productCount: typeof category?.productCount === "number" ? category.productCount : getCategoryProductCount(category),
  }
}

export function buildPaginatorInfo(input: {
  page: number
  limit: number
  total: number
  basePath: string
  query: Record<string, unknown>
}) {
  const { page, limit, total, basePath, query } = input
  const lastPage = Math.max(1, Math.ceil(total / limit))
  const nextPage = page < lastPage ? page + 1 : null
  const prevPage = page > 1 ? page - 1 : null

  const toUrl = (p: number | null) => {
    if (!p) return ""
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue
      if (k === "page") continue
      if (Array.isArray(v)) {
        for (const item of v) params.append(k, String(item))
      } else {
        params.set(k, String(v))
      }
    }
    params.set("page", String(p))
    params.set("limit", String(limit))
    return `${basePath}?${params.toString()}`
  }

  return {
    total,
    count: Math.min(limit, Math.max(0, total - (page - 1) * limit)),
    perPage: limit,
    currentPage: page,
    lastPage,
    nextPageUrl: toUrl(nextPage),
    prevPageUrl: toUrl(prevPage),
  }
}

