import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { mapMedusaProductToFrontend, populateProductsInventory } from "../../_shared/frontend"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const slug = String(req.params.slug ?? "").trim()
  if (!slug) {
    res.status(400).json({ message: "Missing slug" })
    return
  }

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
      "created_at",
      "updated_at",
      "images.*",
      "variants.*",
      "variants.prices.*",
      "variants.inventory_items.inventory_item_id",
      "tags.*",
      "categories.*",
      "collection.id",
      "collection.title",
      "collection.handle",
      "options.*",
      "options.values.*",
    ],
    filters: { handle: slug },
  })

  const product = products?.[0]
  if (!product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  // Populate inventory levels
  await populateProductsInventory([product], query)

  res.json(mapMedusaProductToFrontend(product))
}

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  res.status(204).end()
}
