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
      fields: [
        "id", "customer_id", "status", "email", "payment_status",
        "payment_collections.payments.provider_id",
        "payment_collections.payment_sessions.provider_id"
      ],
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
      const paymentStatus = String((order as any).payment_status ?? "").toLowerCase();
      let paymentProvider = '';
      if (Array.isArray((order as any)?.payment_collections) && (order as any).payment_collections.length) {
        const col = (order as any).payment_collections[0] as any;
        if (col) {
          if (Array.isArray(col.payments) && col.payments.length) {
            const p = col.payments.find((py: any) => py.provider_id && py.provider_id !== "pp_system_default");
            paymentProvider = p ? String(p.provider_id) : String(col.payments[0]?.provider_id ?? "");
          } else if (Array.isArray(col.payment_sessions) && col.payment_sessions.length) {
            const s = col.payment_sessions.find((sn: any) => sn.provider_id && sn.provider_id !== "pp_system_default");
            paymentProvider = s ? String(s.provider_id) : String(col.payment_sessions[0]?.provider_id ?? "");
          }
        }
      }
      const isOnlinePayment = paymentProvider && paymentProvider !== "pp_system_default";

      if (isOnlinePayment && paymentStatus !== "captured" && paymentStatus !== "paid") {
        const client = new pg.Client({
          connectionString: process.env.DATABASE_URL,
        });
        await client.connect();
        try {
          await client.query(
            `UPDATE "order" SET metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{customer_cancelled}', '"true"'::jsonb) WHERE id = $1`,
            [targetOrderId]
          );
        } finally {
          await client.end();
        }
        res.json({ message: "Order canceled successfully." });
        return;
      }

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

    // Also update metadata to show customer cancelled for standard cancellation
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    try {
      await client.query(
        `UPDATE "order" SET metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{customer_cancelled}', '"true"'::jsonb) WHERE id = $1`,
        [targetOrderId]
      );
    } finally {
      await client.end();
    }

    res.json({ message: "Order canceled successfully." });
  } catch (e: any) {
    res.status(500).json({
      message: String(e?.message ?? "Failed to cancel order."),
    });
  }
}
