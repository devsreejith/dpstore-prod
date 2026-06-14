import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function clearAllReservations({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) || console
  const inventoryService = container.resolve(Modules.INVENTORY)

  logger.info("=== START CLEARING ALL RESERVATIONS ===")

  try {
    // 1. Fetch all reservation items (up to 10000 items)
    const reservations = await inventoryService.listReservationItems({}, {
      take: 10000
    })

    if (reservations.length > 0) {
      const reservationIds = reservations.map((r: any) => r.id)
      logger.info(`Found ${reservationIds.length} reservation items. Deleting them...`)
      await inventoryService.deleteReservationItems(reservationIds)
      logger.info("Successfully deleted all reservation items.")
    } else {
      logger.info("No reservation items found.")
    }

    // 2. Fetch all inventory levels and reset reserved_quantity to 0
    const inventoryLevels = await inventoryService.listInventoryLevels({}, {
      take: 10000
    })

    if (inventoryLevels.length > 0) {
      logger.info(`Found ${inventoryLevels.length} inventory levels. Resetting reserved_quantity to 0...`)
      const updates = inventoryLevels.map((level: any) => ({
        inventory_item_id: level.inventory_item_id,
        location_id: level.location_id,
        stocked_quantity: level.stocked_quantity,
        reserved_quantity: 0,
      }))
      await inventoryService.updateInventoryLevels(updates)
      logger.info("Successfully reset all inventory levels' reserved_quantity.")
    } else {
      logger.info("No inventory levels found.")
    }

    logger.info("=== FINISHED CLEARING ALL RESERVATIONS ===")
  } catch (error: any) {
    logger.error(`Error during clearing reservations: ${error.message}`)
  }
}
