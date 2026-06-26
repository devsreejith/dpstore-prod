import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import * as fs from "fs";
import * as path from "path";
import pg from "pg";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") || console;
  const payload = req.body as any;
  const headers = req.headers;

  const expectedHeaderKey = String(process.env.NGENIUS_WEBHOOK_HEADER_KEY || "").trim();
  const expectedHeaderValue = String(process.env.NGENIUS_WEBHOOK_HEADER_VALUE || "").trim();

  if (expectedHeaderKey && expectedHeaderValue) {
    const incomingValue = String(headers[expectedHeaderKey.toLowerCase()] || "").trim();
    if (incomingValue !== expectedHeaderValue) {
      logger.error(`[N-Genius Webhook] Unauthorized webhook request. Header verification failed. Expected key: "${expectedHeaderKey}"`);
      res.status(401).send("Unauthorized");
      return;
    }
    logger.info(`[N-Genius Webhook] Request authorized successfully using custom header: "${expectedHeaderKey}"`);
  }

  logger.info(`[N-Genius Webhook] Received webhook payload: ${JSON.stringify(payload)}`);

  // Store payloads for developer inspection inside backend/.medusa/webhook-logs
  try {
    const logDir = path.join(process.cwd(), ".medusa", "webhook-logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const filename = `ngenius-webhook-${timestamp}-${randomSuffix}.json`;
    const logFilePath = path.join(logDir, filename);

    fs.writeFileSync(
      logFilePath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          headers,
          payload,
        },
        null,
        2
      )
    );

    logger.info(`[N-Genius Webhook] Stored webhook payload for inspection at: ${logFilePath}`);
  } catch (err: any) {
    logger.error(`[N-Genius Webhook] Failed to store payload on disk. Error: ${err.message}`);
  }

  // Extract N-Genius order reference
  const reference =
    payload.orderReference ||
    payload.order_reference ||
    payload.reference ||
    payload.order?.reference ||
    payload.merchantOrderReference ||
    payload.details?.orderReference ||
    (payload.event === "payment.captured" || payload.event === "payment.failed" ? payload.order?.reference : "");

  if (!reference) {
    logger.warn("[N-Genius Webhook] No N-Genius order reference found in payload.");
    res.status(200).json({ received: true, message: "No reference found" });
    return;
  }

  logger.info(`[N-Genius Webhook] Processing notification for reference: ${reference}`);

  let client: any;
  try {
    client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    const restoreOrderIfCanceled = async (paymentCollectionId: string) => {
      const orderRes = await client.query(
        "SELECT order_id FROM order_payment_collection WHERE payment_collection_id = $1 AND deleted_at IS NULL",
        [paymentCollectionId]
      );
      if (orderRes.rows.length > 0) {
        const orderId = orderRes.rows[0].order_id;
        const orderCheck = await client.query(
          "SELECT status, canceled_at FROM \"order\" WHERE id = $1",
          [orderId]
        );
        if (orderCheck.rows.length > 0 && orderCheck.rows[0].status === 'canceled') {
          logger.info(`[N-Genius Webhook] Restoring previously canceled order ${orderId} because payment is now successful.`);
          await client.query(
            "UPDATE \"order\" SET status = 'pending', canceled_at = NULL WHERE id = $1",
            [orderId]
          );
        }
      }
    };

    // Query database to locate the payment session matching the reference
    const dbRes = await client.query(
      "SELECT id, payment_collection_id, data FROM payment_session WHERE (data->>'reference' = $1 OR data->>'id' = $1) AND deleted_at IS NULL",
      [reference]
    );

    if (dbRes.rows.length === 0) {
      logger.warn(`[N-Genius Webhook] No matching payment session found in database for reference: ${reference}`);
      res.status(200).json({ received: true, message: "No session found" });
      return;
    }

    const session = dbRes.rows[0];
    logger.info(`[N-Genius Webhook] Found matching payment session: ${session.id} for collection: ${session.payment_collection_id}`);

    const sessionData = session.data || {};
    const isTest = sessionData.is_test === true || sessionData.is_test === "true" || reference.startsWith("mock-");

    const paymentModuleService = req.scope.resolve("payment");

    // Check transaction status/action from payload to decide what to do
    const action = String(payload.eventName || payload.action || payload.event || "").toUpperCase();
    const isSuccess = action.includes("CAPTURED") || action.includes("SUCCESS") || action.includes("PURCHASED") || action.includes("SALE") || action.includes("AUTHORIZED") || action.includes("AUTH");

    if (isTest) {
      let newStatus = "STARTED";
      if (isSuccess) {
        newStatus = "CAPTURED";
      } else if (action.includes("FAILED") || action.includes("DECLINED") || action.includes("REJECTED")) {
        newStatus = "FAILED";
      } else if (action.includes("CANCELLED") || action.includes("CANCELED")) {
        newStatus = "CANCELED";
      }

      const updatedData = {
        ...sessionData,
        status: newStatus,
        webhook_action: action,
      };

      await client.query(
        "UPDATE payment_session SET data = $1 WHERE id = $2",
        [JSON.stringify(updatedData), session.id]
      );
      logger.info(`[N-Genius Webhook] Updated test payment session ${session.id} data status to ${newStatus}`);
      
      session.data = updatedData;
    }

    // Check if a payment record already exists for this payment session (e.g. from completeCart or authorize endpoint)
    const paymentRes = await client.query(
      "SELECT id, amount, captured_at FROM payment WHERE payment_session_id = $1 AND deleted_at IS NULL LIMIT 1",
      [session.id]
    );

    if (paymentRes.rows.length > 0) {
      let payment = paymentRes.rows[0];
      if (isSuccess) {
        // Restore order if previously canceled by a payment failure webhook
        await restoreOrderIfCanceled(session.payment_collection_id);

        if (payment.captured_at) {
          logger.info(`[N-Genius Webhook] Payment ${payment.id} already captured. Ignoring duplicate capture request.`);
        } else {
          logger.info(`[N-Genius Webhook] Capturing existing payment: ${payment.id}`);
          // Copy session.data to payment.data to ensure capturePayment has the N-Genius reference
          await client.query(
            "UPDATE payment SET data = $1 WHERE id = $2",
            [JSON.stringify(session.data || {}), payment.id]
          );
          await paymentModuleService.capturePayment({
            payment_id: payment.id,
            amount: payment.amount,
          });
          logger.info(`[N-Genius Webhook] Successfully captured payment ${payment.id} for reference: ${reference}`);
        }
      } else {
        const isCancellation = action.includes("CANCELLED") || action.includes("CANCELED");
        const isFailure = action.includes("FAILED") || action.includes("DECLINED") || action.includes("REJECTED");
        if (isCancellation) {
          logger.info(`[N-Genius Webhook] Transaction was cancelled by user. Keeping order pending for retry.`);
        } else if (isFailure) {
          logger.info(`[N-Genius Webhook] Transaction failed. Releasing reservations and canceling order for payment collection ${session.payment_collection_id}`);
          // Find order associated with this payment collection
          const orderRes = await client.query(
            "SELECT order_id FROM order_payment_collection WHERE payment_collection_id = $1 AND deleted_at IS NULL",
            [session.payment_collection_id]
          );
          if (orderRes.rows.length > 0) {
            const orderId = orderRes.rows[0].order_id;
            logger.info(`[N-Genius Webhook] Canceling order ${orderId} due to payment failure.`);
            await client.query(
              "UPDATE \"order\" SET status = 'canceled', canceled_at = NOW() WHERE id = $1",
              [orderId]
            );

            // Find line items of this order to locate reservations
            const lineItemsRes = await client.query(
              "SELECT item_id FROM order_item WHERE order_id = $1 AND deleted_at IS NULL",
              [orderId]
            );
            const lineItemIds = lineItemsRes.rows.map((r: any) => r.item_id);
            if (lineItemIds.length > 0) {
              const reservationsRes = await client.query(
                "SELECT id FROM reservation_item WHERE line_item_id = ANY($1) AND deleted_at IS NULL",
                [lineItemIds]
              );
              const reservationIds = reservationsRes.rows.map((r: any) => r.id);
              if (reservationIds.length > 0) {
                logger.info(`[N-Genius Webhook] Deleting ${reservationIds.length} reservation items: ${JSON.stringify(reservationIds)}`);
                const inventoryService = req.scope.resolve("inventory");
                await inventoryService.deleteReservationItems(reservationIds);
              }
            }
          }
        } else {
          logger.info(`[N-Genius Webhook] Non-failure event received: ${action}. Ignoring.`);
        }
      }
    } else {
      if (isSuccess) {
        logger.info(`[N-Genius Webhook] No payment exists yet. Authorizing and capturing payment session: ${session.id}`);
        const paymentObj = await paymentModuleService.authorizePaymentSession(session.id, {});
        if (paymentObj && paymentObj.id) {
          await paymentModuleService.capturePayment({
            payment_id: paymentObj.id,
            amount: paymentObj.amount,
          });
          logger.info(`[N-Genius Webhook] Successfully authorized and captured payment ${paymentObj.id} for reference: ${reference}`);

          // Restore order if previously canceled by a payment failure webhook
          await restoreOrderIfCanceled(session.payment_collection_id);
        } else {
          logger.warn(`[N-Genius Webhook] Authorization returned no payment object for session: ${session.id}`);
        }
      } else {
        logger.info(`[N-Genius Webhook] Transaction action was not a capture success: ${action} and no payment exists. Ignoring.`);
      }
    }

  } catch (err: any) {
    logger.error(`[N-Genius Webhook] Error processing webhook lifecycle. Error: ${err.message}`);
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {}
    }
  }

  res.status(200).json({ received: true });
}

