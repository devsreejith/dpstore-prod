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

  const enrichCategoryWithCounts = (cat: any): any => {
    const children = Array.isArray(cat?.category_children)
      ? cat.category_children.map(enrichCategoryWithCounts)
      : []
    
    let count = directMap.get(String(cat.id)) || 0
    for (const child of children) {
      count += child.productCount || 0
    }

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

