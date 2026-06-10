import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = String(req.params.id ?? "").trim();
  if (!orderId) {
    res.status(400).json({ message: "Missing order id" });
    return;
  }

  // 1. Resolve Customer ID from session (cast to any for TS compiler)
  const actorId = (req as any).auth_context?.actor_id;
  if (!actorId || !actorId.startsWith("cus_")) {
    res.status(401).json({ message: "Please login to cancel the order." });
    return;
  }

  try {
    // 2. Fetch the order to verify ownership
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id", "status"],
      filters: { id: orderId },
    });

    const order = orders?.[0];
    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }

    // 3. Enforce that customer owns this order
    if (order.customer_id !== actorId) {
      res.status(403).json({ message: "You are not authorized to cancel this order." });
      return;
    }

    // 4. Enforce that the order is not already canceled (using string conversion for strict enums)
    const statusStr = String(order.status).toLowerCase();
    if (statusStr === "canceled" || statusStr === "cancelled") {
      res.status(400).json({ message: "Order is already canceled." });
      return;
    }

    // 5. Run standard Medusa v2 cancel order workflow
    const { cancelOrderWorkflow } = await import("@medusajs/medusa/core-flows");
    await cancelOrderWorkflow(req.scope).run({
      input: {
        order_id: orderId,
      },
    });

    res.json({ message: "Order canceled successfully." });
  } catch (e: any) {
    res.status(500).json({
      message: String(e?.message ?? "Failed to cancel order."),
    });
  }
}
