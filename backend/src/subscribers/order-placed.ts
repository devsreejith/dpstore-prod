import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id
  const logger = container.resolve("logger") || console
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "email", "display_id"],
      filters: { id: orderId },
    })
    const order = orders?.[0]
    if (order) {
      logger.info(`[Email Service Mock] Sending order confirmation email to ${order.email} for order: ${order.display_id || order.id}`);
    }
  } catch (err: any) {
    logger.error(`[Email Service Mock] Failed to send order confirmation email: ${err.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
