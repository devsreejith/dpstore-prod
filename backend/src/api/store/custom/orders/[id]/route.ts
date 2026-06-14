import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import pg from "pg";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as any).auth_context?.actor_id;
  if (!actorId || !actorId.startsWith("cus_")) {
    res.status(401).json({ message: "Unauthorized. Please log in." });
    return;
  }

  const orderId = String(req.params.id ?? "").trim();
  if (!orderId) {
    res.status(400).json({ message: "Order ID is required" });
    return;
  }

  const fieldsStr = req.query.fields as string;
  let fields = fieldsStr ? fieldsStr.split(",") : [
    "id", "display_id", "created_at", "email", "total", "subtotal", "tax_total", "shipping_total", "discount_total", "currency_code", "payment_status", "fulfillment_status", "status", "canceled_at", "updated_at", "metadata",
    "shipping_address.first_name", "shipping_address.last_name", "shipping_address.address_1", "shipping_address.address_2", "shipping_address.city", "shipping_address.province", "shipping_address.postal_code", "shipping_address.country_code", "shipping_address.phone",
    "billing_address.first_name", "billing_address.last_name", "billing_address.address_1", "billing_address.address_2", "billing_address.city", "billing_address.province", "billing_address.postal_code", "billing_address.country_code", "billing_address.phone",
    "shipping_methods.name", "shipping_methods.price",
    "items.id", "items.title", "items.quantity", "items.unit_price", "items.total", "items.subtotal", "items.thumbnail", "items.variant.id", "items.variant.sku", "items.variant.product.thumbnail", "items.variant.product.images.url",
    "payment_collections.id", "payment_collections.captured_amount", "payment_collections.amount", "payment_collections.authorized_amount", "payment_collections.payment_sessions.id", "payment_collections.payment_sessions.provider_id", "payment_collections.payment_sessions.status", "payment_collections.payment_sessions.data",
    "payment_collections.payments.id", "payment_collections.payments.provider_id", "customer_id"
  ];

  if (!fields.includes("customer_id")) {
    fields.push("customer_id");
  }

  // Ensure summary is loaded to compute order total
  if (!fields.includes("summary.*") && !fields.some(f => f.startsWith("summary."))) {
    fields.push("summary.*");
  }

  // Ensure items.* is loaded to retrieve virtual fields like quantity
  if (!fields.includes("items.*")) {
    fields.push("items.*");
  }

  // Map shipping_methods.price to shipping_methods.amount for Medusa v2 compatibility
  fields = fields.map(f => f === "shipping_methods.price" ? "shipping_methods.amount" : f);
  if (!fields.includes("shipping_methods.amount")) {
    fields.push("shipping_methods.amount");
  }

  try {
    let targetOrderId = orderId;
    if (orderId.startsWith("cart_")) {
      const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
      });
      await client.connect();
      try {
        const orderCartRes = await client.query(
          "SELECT order_id FROM order_cart WHERE cart_id = $1 AND deleted_at IS NULL LIMIT 1",
          [orderId]
        );
        if (orderCartRes.rows.length === 0) {
          res.status(404).json({ message: `No order found for cart: ${orderId}` });
          return;
        }
        targetOrderId = orderCartRes.rows[0].order_id;
      } finally {
        await client.end();
      }
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data: orders } = await query.graph({
      entity: "order",
      fields,
      filters: { id: targetOrderId },
    });

    const order = orders?.[0];
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (order.customer_id && order.customer_id !== actorId) {
      res.status(403).json({ message: "You are not authorized to view this order." });
      return;
    }

    // 1. Calculate shipping total and map amount -> price for each shipping method
    let shipping_total = 0;
    if (Array.isArray(order.shipping_methods)) {
      for (const sm of order.shipping_methods) {
        if (sm) {
          const amt = Number(sm.amount ?? 0);
          (sm as any).price = amt;
          shipping_total += amt;
        }
      }
    }

    // 2. Calculate items subtotal and total
    let items_subtotal = 0;
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item) {
          const qty = Number(item.quantity ?? 0);
          const price = Number(item.unit_price ?? 0);
          const sub = price * qty;
          (item as any).subtotal = sub;
          (item as any).total = sub;
          items_subtotal += sub;
        }
      }
    }

    // 3. Assign computed order totals
    (order as any).shipping_total = shipping_total;
    (order as any).subtotal = items_subtotal;
    (order as any).tax_total = Number((order.summary as any)?.tax_total ?? (order as any).tax_total ?? 0);
    (order as any).discount_total = Number((order.summary as any)?.discount_total ?? (order as any).discount_total ?? 0);
    
    const summaryTotal = (order.summary as any)?.current_order_total ?? (order.summary as any)?.accounting_total;
    (order as any).total = summaryTotal !== undefined ? Number(summaryTotal) : (items_subtotal + shipping_total + (order as any).tax_total);

    res.status(200).json({ order });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
