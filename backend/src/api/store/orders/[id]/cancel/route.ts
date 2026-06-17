import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import pg from "pg";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = String(req.params.id ?? "").trim();
  if (!orderId) {
    res.status(400).json({ message: "Missing order id" });
    return;
  }

  // 1. Resolve Customer ID from session (cast to any for TS compiler)
  const actorId = (req as any).auth_context?.actor_id;

  try {
    let targetOrderId = orderId;
    if (orderId.startsWith("ORD-")) {
      const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
      });
      await client.connect();
      try {
        const orderRes = await client.query(
          "SELECT id FROM \"order\" WHERE metadata->>'order_number' = $1 AND deleted_at IS NULL LIMIT 1",
          [orderId]
        );
        if (orderRes.rows.length === 0) {
          const match = orderId.match(/ORD-OL\d+-(\d+)/);
          if (match) {
            const displayId = parseInt(match[1], 10);
            const fallbackRes = await client.query(
              "SELECT id FROM \"order\" WHERE display_id = $1 AND deleted_at IS NULL LIMIT 1",
              [displayId]
            );
            if (fallbackRes.rows.length > 0) {
              targetOrderId = fallbackRes.rows[0].id;
            }
          }
        } else {
          targetOrderId = orderRes.rows[0].id;
        }
      } finally {
        await client.end();
      }
    }

    // 2. Fetch the order to verify ownership
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id", "status", "email", "payment_status"],
      filters: { id: targetOrderId },
    });

    const order = orders?.[0];
    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }

    // 3. Enforce that customer owns this order
    if (order.customer_id) {
      if (actorId && actorId.startsWith("cus_")) {
        if (order.customer_id !== actorId) {
          res.status(403).json({ message: "You are not authorized to cancel this order." });
          return;
        }
      } else {
        const bodyEmail = String((req.body as any)?.email ?? "").trim().toLowerCase();
        const orderEmail = String(order.email ?? "").trim().toLowerCase();
        if (!bodyEmail || bodyEmail !== orderEmail) {
          res.status(401).json({ message: "Please login to cancel this order, or provide the correct order email." });
          return;
        }
      }
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
        order_id: targetOrderId,
      },
    });

    res.json({ message: "Order canceled successfully." });
  } catch (e: any) {
    res.status(500).json({
      message: String(e?.message ?? "Failed to cancel order."),
    });
  }
}
