import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import * as fs from "fs";
import * as path from "path";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") || console;
  const payload = req.body;
  const headers = req.headers;

  logger.info(`[N-Genius Webhook] Received webhook payload: ${JSON.stringify(payload)}`);

  /**
   * TODO: Implement webhook signature verification once official documentation is received.
   * 
   * N-Genius merchant portal webhook configuration supports custom Name, URL, Header Key, and Header Value.
   * Once received, configure the expected Header Key and Value in process.env, and validate here:
   * 
   * const expectedHeaderKey = process.env.NGENIUS_WEBHOOK_HEADER_KEY;
   * const expectedHeaderValue = process.env.NGENIUS_WEBHOOK_HEADER_VALUE;
   * if (expectedHeaderKey && headers[expectedHeaderKey.toLowerCase()] !== expectedHeaderValue) {
   *   logger.error("[N-Genius Webhook] Unauthorized webhook signature/header verification failed.");
   *   res.status(401).send("Unauthorized");
   *   return;
   * }
   */

  try {
    // Store payloads for developer inspection inside backend/webhook-logs
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

  /**
   * TODO: Once sample webhook payloads are received, map status changes to update Medusa orders.
   * 
   * For example:
   * if (payload.event === "payment.captured") {
   *   const orderId = payload.orderReference;
   *   // Use Medusa's workflows / services to capture the payment session
   * }
   */

  res.status(200).json({ received: true });
}
