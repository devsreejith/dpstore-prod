import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function checkInventory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) || console
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("=== INVENTORY DIAGNOSTIC START ===")

  // 1. Check stock locations
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  logger.info(`[1] Stock Locations in DB: ${JSON.stringify(locations)}`)

  // 2. Check inventory items
  const { data: items } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku", "title", "requires_shipping"],
  })
  logger.info(`[2] Inventory Items in DB: ${JSON.stringify(items)}`)

  // 3. Check inventory levels
  const { data: levels } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "inventory_item_id", "location_id", "stocked_quantity"],
  })
  logger.info(`[3] Inventory Levels in DB: ${JSON.stringify(levels)}`)

  // 4. Check links between variants and inventory items
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "variants.id",
      "variants.sku",
      "variants.inventory_items.inventory_item_id"
    ],
    pagination: { skip: 0, take: 100 },
  })

  logger.info("[4] Variant -> Inventory Item Links:")
  for (const p of (products ?? [])) {
    for (const v of (p.variants ?? [])) {
      logger.info(`Product: "${p.title}" | Variant SKU: "${v.sku}" | Links: ${JSON.stringify(v.inventory_items)}`)
    }
  }

  logger.info("=== INVENTORY DIAGNOSTIC END ===")
}
