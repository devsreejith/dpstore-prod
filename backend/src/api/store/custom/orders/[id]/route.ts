import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import pg from "pg";
import { NGeniusClient } from "../../../../../modules/ngenius-payment/ngenius-client";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") || console;
  const orderId = String(req.params.id ?? "").trim();
  
  logger.info(`[Custom GET Order] Entering endpoint with orderId: "${orderId}"`);

  if (!orderId) {
    logger.warn(`[Custom GET Order] Order ID missing from request params`);
    res.status(400).json({ message: "Order ID is required" });
    return;
  }

  const isSecureId = orderId.startsWith("cart_") || orderId.startsWith("pay_col_") || orderId.startsWith("pay-col-") || orderId.startsWith("mc-");
  const actorId = (req as any).auth_context?.actor_id;

  logger.info(`[Custom GET Order] isSecureId: ${isSecureId}, actorId: "${actorId || 'none'}"`);

  const queryEmail = String(req.query.email ?? "").trim().toLowerCase();

  if (!isSecureId) {
    if (!actorId || !actorId.startsWith("cus_")) {
      if (!queryEmail) {
        logger.warn(`[Custom GET Order] Unauthorized. Non-secure ID requested without customer session or query email.`);
        res.status(401).json({ message: "Unauthorized. Please log in or provide your email address to track the order." });
        return;
      }
    }
  }

  const fieldsStr = req.query.fields as string;
  let fields = fieldsStr ? fieldsStr.split(",") : [
    "id", "display_id", "created_at", "email", "total", "subtotal", "tax_total", "shipping_total", "discount_total", "currency_code", "payment_status", "fulfillment_status", "status", "canceled_at", "updated_at", "metadata",
    "shipping_address.first_name", "shipping_address.last_name", "shipping_address.address_1", "shipping_address.address_2", "shipping_address.city", "shipping_address.province", "shipping_address.postal_code", "shipping_address.country_code", "shipping_address.phone",
    "billing_address.first_name", "billing_address.last_name", "billing_address.address_1", "billing_address.address_2", "billing_address.city", "billing_address.province", "billing_address.postal_code", "billing_address.country_code", "billing_address.phone",
    "shipping_methods.name", "shipping_methods.price",
    "items.id", "items.title", "items.quantity", "items.unit_price", "items.total", "items.subtotal", "items.thumbnail", "items.variant.id", "items.variant.sku", "items.variant.product.thumbnail", "items.variant.product.images.url",
    "payment_collections.id", "payment_collections.captured_amount", "payment_collections.amount", "payment_collections.authorized_amount", "payment_collections.payment_sessions.id", "payment_collections.payment_sessions.provider_id", "payment_collections.payment_sessions.status", "payment_collections.payment_sessions.data",
    "payment_collections.payments.id", "payment_collections.payments.provider_id", "payment_collections.payments.data", "customer_id"
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
      logger.info(`[Custom GET Order] Resolving cart_id "${orderId}" via database query`);
      const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
      });
      await client.connect();
      try {
        const orderCartRes = await client.query(
          "SELECT order_id FROM order_cart WHERE cart_id = $1 AND deleted_at IS NULL LIMIT 1",
          [orderId]
        );
        logger.info(`[Custom GET Order] order_cart lookup returned row count: ${orderCartRes.rows.length}`);
        if (orderCartRes.rows.length === 0) {
          logger.warn(`[Custom GET Order] No order found in order_cart for cart: ${orderId}`);
          res.status(404).json({ message: `No order found for cart: ${orderId}` });
          return;
        }
        targetOrderId = orderCartRes.rows[0].order_id;
        logger.info(`[Custom GET Order] Resolved targetOrderId: "${targetOrderId}"`);
      } finally {
        await client.end();
      }
    } else if (orderId.startsWith("pay_col_") || orderId.startsWith("pay-col-")) {
      const normalizedPayColId = orderId.replace(/-/g, "_");
      logger.info(`[Custom GET Order] Resolving payment_collection "${normalizedPayColId}" via database query`);
      const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
      });
      await client.connect();
      try {
        const orderPaymentColRes = await client.query(
          "SELECT order_id FROM order_payment_collection WHERE payment_collection_id = $1 AND deleted_at IS NULL LIMIT 1",
          [normalizedPayColId]
        );
        logger.info(`[Custom GET Order] order_payment_collection lookup returned row count: ${orderPaymentColRes.rows.length}`);
        if (orderPaymentColRes.rows.length === 0) {
          logger.warn(`[Custom GET Order] No order found in order_payment_collection for: ${normalizedPayColId}`);
          res.status(404).json({ message: `No order found for payment collection: ${orderId}` });
          return;
        }
        targetOrderId = orderPaymentColRes.rows[0].order_id;
        logger.info(`[Custom GET Order] Resolved targetOrderId: "${targetOrderId}"`);
      } finally {
        await client.end();
      }
    } else if (orderId.startsWith("mc-")) {
      logger.info(`[Custom GET Order] Resolving mc- fallback reference "${orderId}" via database query`);
      const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
      });
      await client.connect();
      try {
        const sessionRes = await client.query(
          `SELECT opc.order_id 
           FROM payment_session ps
           JOIN order_payment_collection opc ON ps.payment_collection_id = opc.payment_collection_id
           WHERE (ps.data->>'reference' = $1 OR ps.data->>'id' = $1 OR ps.data->>'merchantOrderReference' = $1)
             AND opc.deleted_at IS NULL
           LIMIT 1`,
          [orderId]
        );
        logger.info(`[Custom GET Order] mc- lookup returned row count: ${sessionRes.rows.length}`);
        if (sessionRes.rows.length === 0) {
          logger.warn(`[Custom GET Order] No order found matching mc- reference: ${orderId}`);
          res.status(404).json({ message: `No order found for payment session reference: ${orderId}` });
          return;
        }
        targetOrderId = sessionRes.rows[0].order_id;
        logger.info(`[Custom GET Order] Resolved targetOrderId: "${targetOrderId}"`);
      } finally {
        await client.end();
      }
    } else if (orderId.startsWith("ORD-")) {
      logger.info(`[Custom GET Order] Resolving friendly order number "${orderId}" via database query`);
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
            } else {
              logger.warn(`[Custom GET Order] Friendly order number display ID fallback match failed: ${displayId}`);
              res.status(404).json({ message: `Order not found: ${orderId}` });
              return;
            }
          } else {
            logger.warn(`[Custom GET Order] Friendly order number format mismatch: ${orderId}`);
            res.status(404).json({ message: `Order not found: ${orderId}` });
            return;
          }
        } else {
          targetOrderId = orderRes.rows[0].id;
        }
        logger.info(`[Custom GET Order] Resolved targetOrderId: "${targetOrderId}"`);
      } finally {
        await client.end();
      }
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    logger.info(`[Custom GET Order] Querying Medusa graph for order: "${targetOrderId}"`);
    const { data: orders } = await query.graph({
      entity: "order",
      fields,
      filters: { id: targetOrderId },
    });
 
    const order = orders?.[0];
    logger.info(`[Custom GET Order] Medusa graph lookup result: ${!!order}`);
    if (!order) {
      logger.warn(`[Custom GET Order] Target order not found in Medusa graph: "${targetOrderId}"`);
      res.status(404).json({ message: "Order not found" });
      return;
    }
 
    if (!isSecureId) {
      const orderEmail = String(order.email ?? "").trim().toLowerCase();
      // Case A: User has a customer session
      if (actorId && actorId.startsWith("cus_")) {
        // If the order is associated with a customer account, it MUST match the logged-in customer's actorId
        if (order.customer_id && order.customer_id !== actorId) {
          logger.warn(`[Custom GET Order] Forbidden. Customer ID mismatch on non-secure ID. Cart owned by: ${order.customer_id}, request from: ${actorId}`);
          res.status(403).json({ message: "You are not authorized to view this order." });
          return;
        }
      } else {
        // Case B: Guest tracking via Email
        if (!queryEmail || orderEmail !== queryEmail) {
          logger.warn(`[Custom GET Order] Forbidden. Guest email mismatch. Expected: "${orderEmail}", Got: "${queryEmail}"`);
          res.status(403).json({ message: "Order not found or email does not match." });
          return;
        }
      }
    }

    // Real-time payment status sync with N-Genius
    const paymentCollection = Array.isArray(order.payment_collections) && order.payment_collections.length
      ? (order.payment_collections[0] as any)
      : null;

    // Only sync if not already captured in DB (captured_amount > 0 means already done)
    const alreadyCaptured = Number(paymentCollection?.captured_amount ?? 0) > 0;

    if (paymentCollection && !alreadyCaptured) {
      logger.info(`[Custom GET Order] Payment not yet captured for collection ${paymentCollection.id}. Checking N-Genius status...`);
      const syncClient = new pg.Client({
        connectionString: process.env.DATABASE_URL,
      });
      await syncClient.connect();
      try {
        // Find the N-Genius payment session for this collection
        const sessionRes = await syncClient.query(
          "SELECT id, data, provider_id FROM payment_session WHERE payment_collection_id = $1 AND provider_id LIKE '%ngenius%' LIMIT 1",
          [paymentCollection.id]
        );

        if (sessionRes.rows.length > 0) {
          const session = sessionRes.rows[0];
          const sessionData = session.data || {};
          const reference = sessionData.reference || sessionData.id;

          logger.info(`[Custom GET Order] N-Genius session found: ${session.id}, reference: ${reference}`);

          if (reference) {
            const ngeniusClient = new NGeniusClient({
              apiKey: process.env.NGENIUS_API_KEY || "",
              merchantId: process.env.NGENIUS_MERCHANT_ID || "",
              outletId: process.env.NGENIUS_OUTLET_ID || "",
              tokenUrl: process.env.NGENIUS_TOKEN_URL || "",
              transactionUrl: process.env.NGENIUS_TRANSACTION_URL || "",
              successUrl: process.env.NGENIUS_SUCCESS_URL || "",
              failureUrl: process.env.NGENIUS_FAILURE_URL || "",
              cancelUrl: process.env.NGENIUS_CANCEL_URL || "",
            }, logger);

            const statusResponse = await ngeniusClient.getOrderStatus(reference);
            logger.info(`[Custom GET Order] N-Genius raw status: ${JSON.stringify(statusResponse)}`);

            // Check embedded payment status first (most reliable), then top-level state
            let resolvedState = String(statusResponse.status || statusResponse.state || "").toUpperCase();
            const embeddedPayments = (statusResponse as any)._embedded?.payment;
            if (Array.isArray(embeddedPayments) && embeddedPayments.length > 0) {
              const latestPayment = embeddedPayments[embeddedPayments.length - 1];
              const embState = latestPayment.status || latestPayment.state;
              if (embState) {
                resolvedState = String(embState).toUpperCase();
              }
            }
            logger.info(`[Custom GET Order] Resolved N-Genius state: ${resolvedState}`);

            const isSuccess = ["CAPTURED", "PURCHASED", "SUCCESS"].includes(resolvedState);
            const isAuthorized = ["AUTHORIZED", "AUTH"].includes(resolvedState);

            if (isSuccess || isAuthorized) {
              logger.info(`[Custom GET Order] Payment confirmed as ${resolvedState}. Applying direct DB sync...`);

              // Build the merged data to store (preserves reference for future lookups)
              const mergedData = { ...sessionData, ...statusResponse, reference };

              // Find the existing payment row (created by completeCart or authorize flow)
              const paymentRes = await syncClient.query(
                "SELECT id, amount, captured_at FROM payment WHERE payment_session_id = $1 AND deleted_at IS NULL LIMIT 1",
                [session.id]
              );

              let paymentId = paymentRes.rows[0]?.id;
              const capturedAt = paymentRes.rows[0]?.captured_at;
              const paymentAmount = paymentRes.rows[0]?.amount ?? paymentCollection.amount;

              if (!paymentId) {
                // No payment record yet — try Medusa's authorize flow
                logger.info(`[Custom GET Order] No payment row yet. Trying authorizePaymentSession...`);
                try {
                  const paymentModuleService = req.scope.resolve("payment");
                  const paymentObj = await paymentModuleService.authorizePaymentSession(session.id, {});
                  paymentId = paymentObj?.id;
                  logger.info(`[Custom GET Order] authorizePaymentSession succeeded. Payment ID: ${paymentId}`);
                } catch (authErr: any) {
                  logger.warn(`[Custom GET Order] authorizePaymentSession failed (${authErr.message}). Inserting payment row directly...`);
                  // Fallback: create payment row directly
                  try {
                    const currRes = await syncClient.query(
                      "SELECT currency_code FROM payment_collection WHERE id = $1 LIMIT 1",
                      [paymentCollection.id]
                    );
                    const currencyCode = currRes.rows[0]?.currency_code || "aed";
                    const insertRes = await syncClient.query(
                      `INSERT INTO payment (id, payment_session_id, provider_id, amount, currency_code, data, created_at, updated_at)
                       VALUES (
                         'pay_' || replace(gen_random_uuid()::text, '-', ''),
                         $1, $2, $3, $4, $5, NOW(), NOW()
                       ) ON CONFLICT DO NOTHING RETURNING id`,
                      [session.id, session.provider_id, paymentAmount, currencyCode, JSON.stringify(mergedData)]
                    );
                    paymentId = insertRes.rows[0]?.id;
                    logger.info(`[Custom GET Order] Fallback direct payment insert. ID: ${paymentId}`);
                  } catch (insertErr: any) {
                    logger.error(`[Custom GET Order] Fallback insert also failed: ${insertErr.message}`);
                  }
                }
              }

              if (paymentId) {
                if (isSuccess && !capturedAt) {
                  // Mark payment as captured directly in DB
                  logger.info(`[Custom GET Order] Marking payment ${paymentId} as captured in DB...`);
                  await syncClient.query(
                    "UPDATE payment SET data = $1, captured_at = NOW(), updated_at = NOW() WHERE id = $2",
                    [JSON.stringify(mergedData), paymentId]
                  );
                  // Update payment_collection captured_amount
                  await syncClient.query(
                    "UPDATE payment_collection SET captured_amount = amount, updated_at = NOW() WHERE id = $1",
                    [paymentCollection.id]
                  );
                  // Update order payment_status to 'captured'
                  const orderLookup = await syncClient.query(
                    "SELECT order_id FROM order_payment_collection WHERE payment_collection_id = $1 AND deleted_at IS NULL LIMIT 1",
                    [paymentCollection.id]
                  );
                  if (orderLookup.rows.length > 0) {
                    await syncClient.query(
                      "UPDATE \"order\" SET payment_status = 'captured', updated_at = NOW() WHERE id = $1",
                      [orderLookup.rows[0].order_id]
                    );
                    logger.info(`[Custom GET Order] Updated order ${orderLookup.rows[0].order_id} payment_status to 'captured'`);
                  }

                  // Reflect in-memory for immediate response
                  (order as any).payment_status = "captured";
                  paymentCollection.status = "captured";
                  paymentCollection.captured_amount = paymentCollection.amount;

                } else if (isAuthorized && !capturedAt) {
                  // Mark payment_session as authorized
                  logger.info(`[Custom GET Order] Marking payment_session ${session.id} as authorized in DB...`);
                  await syncClient.query(
                    "UPDATE payment_session SET data = $1, status = $2, updated_at = NOW() WHERE id = $3",
                    [JSON.stringify(mergedData), "authorized", session.id]
                  );
                  await syncClient.query(
                    "UPDATE payment_collection SET authorized_amount = amount, updated_at = NOW() WHERE id = $1",
                    [paymentCollection.id]
                  );

                  // Reflect in-memory
                  (order as any).payment_status = "authorized";
                  paymentCollection.status = "authorized";
                  paymentCollection.authorized_amount = paymentCollection.amount;
                }
              }

              // Inject N-Genius status data into payments array for frontend isPaymentSuccessful check
              if (!Array.isArray(paymentCollection.payments)) {
                paymentCollection.payments = [];
              }
              if (paymentCollection.payments.length === 0) {
                paymentCollection.payments.push({
                  provider_id: "pp_ngenius_ngenius",
                  data: statusResponse,
                } as any);
              } else {
                paymentCollection.payments[0] = {
                  ...(paymentCollection.payments[0] || {}),
                  data: statusResponse,
                } as any;
              }
            }
          }
        } else {
          logger.info(`[Custom GET Order] No N-Genius payment session found for collection ${paymentCollection.id}`);
        }
      } catch (syncErr: any) {
        logger.error(`[Custom GET Order] Sync payment failed: ${syncErr.message}`, syncErr);
      } finally {
        await syncClient.end();
      }
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
    logger.error(`[Custom GET Order] Exception in custom order status lookup: ${error.message}`, error);
    res.status(500).json({ error: error.message });
  }
}
