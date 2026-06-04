import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { mapMedusaCategoryToFrontend } from "../v1/_shared/frontend"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
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
    pagination: { skip: 0, take: 200 },
  })

  const mapped = (categories ?? []).map((c: any) => mapMedusaCategoryToFrontend(c))
  res.json({ data: mapped })
}
