import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { mapMedusaCategoryToFrontend } from "../../_shared/frontend"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const slug = String(req.params.slug ?? "").trim()
  if (!slug) {
    res.status(400).json({ message: "Missing slug" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: categories } = await query.graph({
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
      "category_children.*",
      "category_children.metadata",
    ],
    filters: { handle: slug },
  })

  const category = categories?.[0]
  if (!category) {
    res.status(404).json({ message: "Category not found" })
    return
  }

  const mapped = mapMedusaCategoryToFrontend(category)
  const children = Array.isArray(category?.category_children) ? category.category_children : []
  res.json({
    ...mapped,
    ...(children.length
      ? { children: children.map((c: any) => mapMedusaCategoryToFrontend(c)) }
      : {}),
  })
}

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  res.status(204).end()
}

