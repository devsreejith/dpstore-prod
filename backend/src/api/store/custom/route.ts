import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id", "display_id", "created_at", "email", "currency_code", "status",
        "summary.*",
        "items.*"
      ],
    });
    res.status(200).json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) || console;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const inventoryService = req.scope.resolve(Modules.INVENTORY);

  try {
    const { action, variant_id, quantity } = req.body as any;

    if (action !== "reset-inventory") {
      res.status(400).json({ message: "Unsupported action" });
      return;
    }

    if (!variant_id) {
      res.status(400).json({ message: "variant_id is required" });
      return;
    }

    const targetQty = typeof quantity === "number" ? quantity : 10;

    logger.info(`[Custom Reset Inventory] Resetting inventory for variant: ${variant_id} to quantity: ${targetQty}`);

    // 1. Fetch the inventory item ID linked to the variant
    const { data: pvItems } = await query.graph({
      entity: "product_variant",
      fields: ["id", "inventory_items.inventory_item_id"],
      filters: { id: variant_id },
    });

    const variant = pvItems?.[0];
    const inventoryItemId = variant?.inventory_items?.[0]?.inventory_item_id;

    if (!inventoryItemId) {
      res.status(404).json({ message: `No inventory item linked to variant: ${variant_id}` });
      return;
    }

    // 2. Fetch all reservation items for this inventory item
    const reservations = await inventoryService.listReservationItems({
      inventory_item_id: [inventoryItemId],
    });

    if (reservations.length > 0) {
      const reservationIds = reservations.map((r: any) => r.id);
      logger.info(`[Custom Reset Inventory] Deleting ${reservationIds.length} reservation items: ${JSON.stringify(reservationIds)}`);
      await inventoryService.deleteReservationItems(reservationIds);
    }

    // 3. Fetch all location levels for this inventory item to update them
    const inventoryLevels = await inventoryService.listInventoryLevels({
      inventory_item_id: [inventoryItemId],
    });

    if (inventoryLevels.length > 0) {
      const updates = inventoryLevels.map((level: any) => ({
        inventory_item_id: level.inventory_item_id,
        location_id: level.location_id,
        stocked_quantity: targetQty,
        reserved_quantity: 0,
      }));
      logger.info(`[Custom Reset Inventory] Updating ${updates.length} inventory levels: ${JSON.stringify(updates)}`);
      await inventoryService.updateInventoryLevels(updates);
    } else {
      // If no inventory level exists, we find default stock location and create one
      const { data: stockLocations } = await query.graph({
        entity: "stock_location",
        fields: ["id"],
        pagination: { skip: 0, take: 1 },
      });
      const stockLocationId = stockLocations?.[0]?.id;
      if (stockLocationId) {
        logger.info(`[Custom Reset Inventory] Creating default inventory level at location: ${stockLocationId}`);
        await inventoryService.createInventoryLevels({
          inventory_item_id: inventoryItemId,
          location_id: stockLocationId,
          stocked_quantity: targetQty,
        });
      }
    }

    // 4. Ensure variant inventory settings are correct
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    if (productModuleService) {
      await productModuleService.updateProductVariants(variant_id, {
        manage_inventory: true,
        allow_backorder: false,
      });
      logger.info(`[Custom Reset Inventory] Updated variant settings to manage_inventory: true and allow_backorder: false`);
    }

    res.status(200).json({ success: true, message: "Inventory reset successfully" });
  } catch (error: any) {
    logger.error(`[Custom Reset Inventory] Error resetting inventory. Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}

