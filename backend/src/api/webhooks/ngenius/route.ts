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

  // Store payloads for developer inspection inside backend/webhook-logs
  try {
    const logDir = path.join(process.cwd(), "webhook-logs");
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

    // Query database to locate the payment session matching the reference
    const dbRes = await client.query(
      "SELECT id, payment_collection_id FROM payment_session WHERE (data->>'reference' = $1 OR data->>'id' = $1) AND deleted_at IS NULL",
      [reference]
    );

    if (dbRes.rows.length === 0) {
      logger.warn(`[N-Genius Webhook] No matching payment session found in database for reference: ${reference}`);
      res.status(200).json({ received: true, message: "No session found" });
      return;
    }

    const session = dbRes.rows[0];
    logger.info(`[N-Genius Webhook] Found matching payment session: ${session.id} for collection: ${session.payment_collection_id}`);

    const paymentModuleService = req.scope.resolve("payment");

    // Check transaction status/action from payload to decide what to do
    const action = String(payload.action || payload.event || "").toUpperCase();
    const isSuccess = action.includes("CAPTURED") || action.includes("SUCCESS") || action.includes("PURCHASED") || action.includes("SALE");

    if (isSuccess) {
      logger.info(`[N-Genius Webhook] Authorizing and capturing payment session: ${session.id}`);
      
      // Authorize
      const payment = await paymentModuleService.authorizePaymentSession(session.id, {});
      if (payment && payment.id) {
        // Capture
        await paymentModuleService.capturePayment({
          payment_id: payment.id,
          amount: payment.amount,
        });
        logger.info(`[N-Genius Webhook] Successfully authorized and captured payment ${payment.id} for reference: ${reference}`);
      } else {
        logger.warn(`[N-Genius Webhook] Authorization returned no payment object for session: ${session.id}`);
      }
    } else {
      logger.info(`[N-Genius Webhook] Transaction action was not a capture success: ${action}. Ignoring lifecycle transition.`);
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

