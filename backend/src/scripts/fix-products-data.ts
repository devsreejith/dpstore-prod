import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function fixProductsData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) || console
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("[Fix Products] Starting product details correction...")

  // 1. Fetch default shipping profile
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    pagination: { skip: 0, take: 1 },
  })
  const shippingProfileId = shippingProfiles?.[0]?.id
  if (!shippingProfileId) {
    logger.error("[Fix Products] No shipping profile found. Please run the shipping setup script first.")
    return
  }
  logger.info(`[Fix Products] Resolved shipping profile ID: ${shippingProfileId}`)

  // 2. Fetch default sales channel
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    pagination: { skip: 0, take: 1 },
  })
  const salesChannelId = salesChannels?.[0]?.id
  if (!salesChannelId) {
    logger.error("[Fix Products] No sales channel found. Please run the seed script first.")
    return
  }
  logger.info(`[Fix Products] Resolved sales channel ID: ${salesChannelId}`)

  // 3. Fetch default stock location
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
    pagination: { skip: 0, take: 1 },
  })
  const stockLocationId = stockLocations?.[0]?.id
  if (!stockLocationId) {
    logger.warn("[Fix Products] No stock location found. Inventory levels will not be seeded.")
  } else {
    logger.info(`[Fix Products] Resolved stock location ID: ${stockLocationId}`)
  }

  // 4. Fetch all products
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "metadata",
      "shipping_profile_id",
      "variants.id",
      "options.id",
    ],
    pagination: { skip: 0, take: 5000 },
  })

  logger.info(`[Fix Products] Found ${products?.length || 0} total products in database.`)

  const productsToFix = (products ?? []).filter((p: any) => !p.variants || p.variants.length === 0)
  logger.info(`[Fix Products] Found ${productsToFix.length} products missing variants/options.`)

  const { updateProductsWorkflow } = await import("@medusajs/medusa/core-flows")
  const { createInventoryLevelsWorkflow } = await import("@medusajs/medusa/core-flows")

  for (const product of productsToFix) {
    logger.info(`[Fix Products] Fixing product: "${product.title}" (${product.id})`)

    const metadata = product.metadata ?? {}
    const priceVal = metadata.price ?? metadata.retail_price ?? 10
    const price = Number(priceVal) || 10
    const sku = String(metadata.item_code ?? metadata.sku ?? `SKU-${product.handle.slice(0, 30)}`).trim()

    try {
      // Create option, variant, link sales channel and shipping profile
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: product.id },
          update: {
            shipping_profile_id: product.shipping_profile_id || shippingProfileId,
            sales_channels: [{ id: salesChannelId }],
            options: [{ title: "Default", values: ["Default"] }],
            variants: [
              {
                title: "Default",
                sku: sku,
                options: { Default: "Default" },
                prices: [{ amount: price, currency_code: "aed" }],
                manage_inventory: true,
              },
            ],
          },
        },
      })

      // Query variant to get inventory_item_id
      const { data: updatedProducts } = await query.graph({
        entity: "product",
        fields: ["variants.inventory_items.inventory_item_id"],
        filters: { id: product.id },
      })
      const newVariant = updatedProducts?.[0]?.variants?.[0]
      const inventoryItemId = newVariant?.inventory_items?.[0]?.inventory_item_id

      if (inventoryItemId && stockLocationId) {
        await createInventoryLevelsWorkflow(container).run({
          input: {
            inventory_levels: [
              {
                location_id: stockLocationId,
                stocked_quantity: 1000,
                inventory_item_id: inventoryItemId,
              },
            ],
          },
        })
        logger.info(`[Fix Products] Success: Added default options, variant, price (${price} AED), and 1,000 units of stock.`)
      } else {
        logger.info(`[Fix Products] Success: Added default options, variant, price (${price} AED) but skipped inventory.`)
      }
    } catch (e: any) {
      logger.error(`[Fix Products] Failed to fix product "${product.title}": ${e.message}`)
    }
  }

  logger.info("[Fix Products] Product details correction completed!")
}
