import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { mapMedusaProductToFrontend } from "../v1/_shared/frontend"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const baseFields = [
    "id",
    "title",
    "handle",
    "description",
    "thumbnail",
    "metadata",
    "images.*",
    "variants.*",
    "variants.prices.*",
    "tags.*",
    "categories.*",
    "options.*",
    "options.values.*",
  ]

  const { data: featured } = await query.graph({
    entity: "product",
    fields: baseFields,
    filters: { metadata: { featured: true } } as any,
    pagination: { skip: 0, take: 50 },
  })

  if (featured?.length) {
    res.json(featured.map((p: any) => mapMedusaProductToFrontend(p)))
    return
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: baseFields,
    pagination: { skip: 0, take: 50 },
  })

  res.json((products ?? []).map((p: any) => mapMedusaProductToFrontend(p)))
}
