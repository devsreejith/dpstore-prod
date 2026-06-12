import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function fixInventoryLinks({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) || console
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const inventoryService = container.resolve(Modules.INVENTORY)
  const remoteLink = container.resolve("remoteLink")

  logger.info("[Fix Inventory] Starting inventory link correction...")

  // 1. Resolve stock location
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
    pagination: { skip: 0, take: 1 },
  })
  const stockLocationId = stockLocations?.[0]?.id
  if (!stockLocationId) {
    logger.error("[Fix Inventory] No stock location found.")
    return
  }
  logger.info(`[Fix Inventory] Using stock location ID: ${stockLocationId}`)

  // 2. Fetch all products and variants
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "variants.id",
      "variants.sku",
      "variants.inventory_items.inventory_item_id"
    ],
    pagination: { skip: 0, take: 5000 },
  })

  const { createInventoryLevelsWorkflow } = await import("@medusajs/medusa/core-flows")

  let fixedCount = 0
  for (const product of (products ?? [])) {
    for (const variant of (product.variants ?? [])) {
      const links = variant.inventory_items ?? []
      if (links.length === 0) {
        logger.info(`[Fix Inventory] Fixing variant "${variant.sku}" of product "${product.title}"`)

        try {
          // A. Create inventory item
          const sku = variant.sku || `SKU-${variant.id.slice(0, 10)}`
          const inventoryItem = await inventoryService.createInventoryItems({
            sku: sku,
            title: `${product.title} - Default`,
            requires_shipping: true,
          })

          logger.info(`[Fix Inventory] Created inventory item: ${inventoryItem.id} for SKU: ${sku}`)

          // B. Link variant to inventory item
          await remoteLink.create({
            [Modules.PRODUCT]: { variant_id: variant.id },
            [Modules.INVENTORY]: { inventory_item_id: inventoryItem.id },
          })
          logger.info("[Fix Inventory] Linked variant to inventory item.")

          // C. Create inventory level
          await createInventoryLevelsWorkflow(container).run({
            input: {
              inventory_levels: [
                {
                  location_id: stockLocationId,
                  stocked_quantity: 1000,
                  inventory_item_id: inventoryItem.id,
                },
              ],
            },
          })
          logger.info("[Fix Inventory] Created inventory level (1,000 units).")
          fixedCount++
        } catch (e: any) {
          logger.error(`[Fix Inventory] Failed for variant "${variant.sku}": ${e.message}`)
        }
      }
    }
  }

  logger.info(`[Fix Inventory] Inventory link correction completed! Fixed ${fixedCount} variants.`)
}
