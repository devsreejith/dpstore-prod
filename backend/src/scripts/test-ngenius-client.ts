import { ExecArgs } from "@medusajs/framework/types";
import { NGeniusClient } from "../modules/ngenius-payment/ngenius-client";
import * as dotenv from "dotenv";
import * as path from "path";

export default async function testNGenius({ container }: ExecArgs) {
  const logger = container.resolve("logger") || console;
  
  // Explicitly load .env
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

  const config = {
    apiKey: process.env.NGENIUS_API_KEY || "",
    merchantId: process.env.NGENIUS_MERCHANT_ID || "",
    outletId: process.env.NGENIUS_OUTLET_ID || "",
    tokenUrl: process.env.NGENIUS_TOKEN_URL || "https://api-gateway.sandbox.ngenius-payments.com/identity/auth/access-token",
    transactionUrl: process.env.NGENIUS_TRANSACTION_URL || "https://api-gateway.sandbox.ngenius-payments.com/transactions/outlets/{OUTLET_ID}/orders",
    successUrl: process.env.NGENIUS_SUCCESS_URL || "http://localhost:3000/order",
    failureUrl: process.env.NGENIUS_FAILURE_URL || "http://localhost:3000/order",
    cancelUrl: process.env.NGENIUS_CANCEL_URL || "http://localhost:3000/order",
  };

  logger.info(`[Test] Running client test with config: ${JSON.stringify({ ...config, apiKey: "******" })}`);

  try {
    const client = new NGeniusClient(config, logger);
    
    logger.info("[Test] Fetching access token...");
    const token = await client.getAccessToken();
    logger.info(`[Test] Token fetched successfully: ${token.substring(0, 15)}...`);

    logger.info("[Test] Creating sandbox order...");
    const orderRes = await client.createOrder(8900, "AED", `test-ref-${Date.now()}`, "test@gmail.com");
    logger.info(`[Test] Order created successfully: ${JSON.stringify(orderRes)}`);
  } catch (err: any) {
    logger.error(`[Test] Test failed with error: ${err.message}`);
    if (err.stack) {
      logger.error(err.stack);
    }
  }
}
