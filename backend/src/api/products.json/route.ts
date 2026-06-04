import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { mapMedusaProductToFrontend } from "../v1/_shared/frontend"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
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
    ],
    pagination: { skip: 0, take: 500 },
  })

  res.json((products ?? []).map((p: any) => mapMedusaProductToFrontend(p)))
}
