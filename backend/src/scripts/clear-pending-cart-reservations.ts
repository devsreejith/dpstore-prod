import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import pg from "pg"

export default async function clearPendingCartReservations({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) || console

  logger.info("=== START CLEARING RESERVATIONS FOR PENDING PAYMENT CARTS ===")

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  })

  await client.connect()

  try {
    // 1. Identify reservations for carts that do not have a completed order
    const findRes = await client.query(`
      SELECT r.id, r.line_item_id, r.quantity, cli.cart_id
      FROM reservation_item r
      JOIN cart_line_item cli ON r.line_item_id = cli.id
      LEFT JOIN order_cart oc ON cli.cart_id = oc.cart_id
      WHERE r.deleted_at IS NULL
        AND oc.order_id IS NULL
    `)

    const pendingReservations = findRes.rows
    logger.info(`Found ${pendingReservations.length} active reservations belonging to pending payment/abandoned carts.`)

    if (pendingReservations.length > 0) {
      // Print the items being cleared
      pendingReservations.forEach((r: any) => {
        logger.info(`- Reservation ID: ${r.id} | Cart Item ID: ${r.line_item_id} | Cart ID: ${r.cart_id} | Qty: ${r.quantity}`)
      })

      // 2. Soft delete the pending cart reservations
      const idsToDelete = pendingReservations.map((r: any) => r.id)
      await client.query(`
        UPDATE reservation_item
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ANY($1)
      `, [idsToDelete])
      logger.info(`Successfully marked ${idsToDelete.length} reservations as deleted in the database.`)

      // 3. Recalculate and update reserved_quantity on all inventory levels
      logger.info("Recalculating reserved_quantity on all inventory levels...")
      const updateLevels = await client.query(`
        UPDATE inventory_level il
        SET reserved_quantity = COALESCE(
          (
            SELECT SUM(quantity)
            FROM reservation_item r
            WHERE r.inventory_item_id = il.inventory_item_id
              AND r.deleted_at IS NULL
          ),
          0
        )
        RETURNING inventory_item_id, stocked_quantity, reserved_quantity
      `)
      logger.info(`Updated ${updateLevels.rowCount} inventory levels with remaining active reservations.`)
    } else {
      logger.info("No stuck pending payment cart reservations found to clear.")
    }

    logger.info("=== FINISHED CLEARING RESERVATIONS ===")
  } catch (error: any) {
    logger.error(`Error during clearing reservations: ${error.message}`)
  } finally {
    await client.end()
  }
}
