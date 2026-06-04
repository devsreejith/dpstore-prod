import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  PaginationSchema,
  buildPaginatorInfo,
  mapMedusaCategoryToFrontend,
} from "../_shared/frontend"

function mapNested(category: any): any {
  const mapped = mapMedusaCategoryToFrontend(category)
  const children = Array.isArray(category?.category_children) ? category.category_children : []
  if (children.length) {
    return {
      ...mapped,
      children: children.map(mapNested),
    }
  }
  return mapped
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = PaginationSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid query", errors: parsed.error.flatten() })
    return
  }

  const { page, limit } = parsed.data
  const skip = (page - 1) * limit
  const take = limit

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: categories, metadata } = await query.graph({
    entity: "product_category",
    fields: [
      "id",
      "name",
      "handle",
      "description",
      "metadata",
      "created_at",
      "updated_at",
      "parent_category_id",
      "products.id",
      "category_children.*",
      "category_children.metadata",
      "category_children.products.id",
      "category_children.category_children.*",
      "category_children.category_children.metadata",
      "category_children.category_children.products.id",
    ],
    pagination: { skip, take },
  })

  const directMap = new Map<string, number>()
  try {
    const { Client } = require("pg")
    const dbUrl = process.env.DATABASE_URL || "postgresql://medusa:medusa@localhost:5433/dp_store"
    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    const dbRes = await client.query("SELECT pcp.product_category_id, COUNT(DISTINCT p.id) as count FROM product_category_product pcp JOIN product p ON pcp.product_id = p.id WHERE p.deleted_at IS NULL GROUP BY pcp.product_category_id")
    for (const row of dbRes.rows) {
      directMap.set(String(row.product_category_id), Number(row.count))
    }
    await client.end()
  } catch (err) {
    console.error("Failed to query product category counts:", err)
  }

  const idToSlug = new Map<string, string>()
  const slugToId = new Map<string, string>()
  
  const registerCategory = (cat: any) => {
    const cId = String(cat?.id ?? "")
    const cSlug = String(cat?.handle ?? cat?.slug ?? "")
    if (cId && cSlug) {
      idToSlug.set(cId, cSlug)
      slugToId.set(cSlug, cId)
    }
    const kids = Array.isArray(cat?.category_children) ? cat.category_children : []
    for (const kid of kids) {
      registerCategory(kid)
    }
  }

  for (const cat of categories ?? []) {
    registerCategory(cat)
  }

  const logicalHierarchy: Record<string, string[]> = {
    "gifts": [
      "bags-&-wallets", "bags-&-pouches", "purse-&-wallets",
      "keychain", "others",
      "drinkware", "mug", "water-bottle",
      "magnet", "metal-magnet",
      "stationery", "notebook", "pencil", "pen", "pencil-case",
      "travel-accessories", "neck-pillow",
      "phone-cover", "cover"
    ],
    "bags-&-wallets": ["bags-&-pouches", "purse-&-wallets"],
    "drinkware": ["mug", "water-bottle"],
    "magnet": ["metal-magnet"],
    "stationery": ["notebook", "pencil", "pen", "pencil-case"],
    "travel-accessories": ["neck-pillow"],
    "phone-cover": ["cover"],
    "apparels": ["t-shirt", "dp-t-shirt", "kids-uniform", "hoodies", "caps", "dp-uniforms"],
    "t-shirt": ["dp-t-shirt", "kids-uniform"],
    "toys-games": ["toys", "toy-car", "plush-toys", "cars"],
    "toys": ["toy-car", "plush-toys", "cars"]
  }

  const getProductCountBySlug = (slug: string): number => {
    const collectedSlugs = new Set<string>()
    collectedSlugs.add(slug)

    const collectDescendants = (s: string) => {
      const children = logicalHierarchy[s] || []
      for (const ch of children) {
        if (!collectedSlugs.has(ch)) {
          collectedSlugs.add(ch)
          collectDescendants(ch)
        }
      }
    }
    collectDescendants(slug)

    let total = 0
    for (const s of collectedSlugs) {
      const cId = slugToId.get(s)
      if (cId) {
        total += directMap.get(cId) || 0
      }
    }
    return total
  }

  const enrichCategoryWithCounts = (cat: any): any => {
    const children = Array.isArray(cat?.category_children)
      ? cat.category_children.map(enrichCategoryWithCounts)
      : []
    const cSlug = String(cat?.handle ?? cat?.slug ?? "")
    const count = getProductCountBySlug(cSlug)
    return {
      ...cat,
      category_children: children,
      productCount: count,
    }
  }

  const enrichedCategories = (categories ?? []).map(enrichCategoryWithCounts)

  res.json({
    data: enrichedCategories.map(mapNested),
    paginatorInfo: buildPaginatorInfo({
      page,
      limit,
      total: Number(metadata?.count ?? (categories ?? []).length),
      basePath: "/api/v1/categories",
      query: req.query as any,
    }),
  })
}

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  res.status(204).end()
}

