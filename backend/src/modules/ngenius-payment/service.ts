import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import { NGeniusClient } from "./ngenius-client";
import { NGeniusConfig } from "./types";
import pg from "pg";

function sanitizeNGeniusData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  const cloned = JSON.parse(JSON.stringify(obj));

  const scrub = (target: any) => {
    if (!target || typeof target !== "object") return;

    const keysToScrub = [
      "pan",
      "paymentMethod",
      "payment_method",
      "cardBrand",
      "card_brand",
      "cardScheme",
      "card_scheme",
      "cardType",
      "card_type",
      "maskedPan",
      "masked_pan",
      "expiry",
      "cardholderName",
      "cardholder_name"
    ];

    for (const key of keysToScrub) {
      if (key in target) {
        delete target[key];
      }
    }

    for (const k of Object.keys(target)) {
      if (typeof target[k] === "object") {
        scrub(target[k]);
      }
    }
  };

  scrub(cloned);
  return cloned;
}

export class NGeniusPaymentService extends AbstractPaymentProvider<any> {
  static identifier = "ngenius";
  protected client: NGeniusClient;
  protected logger: any;
  protected container: any;

  constructor(container: any, options: NGeniusConfig) {
    super(container, options);
    this.container = container;
    this.logger = container.logger || console;
    this.client = new NGeniusClient(options, this.logger);
  }

  /**
   * Initiate a payment session on the N-Genius gateway.
   */
  async initiatePayment(input: any): Promise<any> {
    try {
      this.logger.info(`[N-Genius Service] initiatePayment input: ${JSON.stringify(input)}`);
      const { amount, currency_code, context, data } = input;

      // Extract raw numeric value if Medusa passes a BigNumber object
      let amountValue = amount;
      if (typeof amount === "object" && amount !== null) {
        amountValue = amount.value ?? amount.raw?.value ?? amount;
      }
      const parsedAmount = Math.round(Number(amountValue));

      // Retrieve cart or order ID from input
      const cartIdOrOrderId = data?.cart_id || data?.order_id || context?.cart_id || context?.cart?.id || input.cart_id || (context?.resource_id?.startsWith("cart_") ? context.resource_id : undefined) || (input.resource_id?.startsWith("cart_") ? input.resource_id : undefined) || (context?.resource_id?.startsWith("ord_") ? context.resource_id : undefined) || (input.resource_id?.startsWith("ord_") ? input.resource_id : undefined);

      let orderReference = "";
      let customerEmail = context?.email || context?.customer?.email;
      let customerPhone = context?.shipping_address?.phone || context?.billing_address?.phone || context?.customer?.phone;
      let customerFirstName = context?.shipping_address?.first_name || context?.billing_address?.first_name || context?.customer?.first_name;
      let customerLastName = context?.shipping_address?.last_name || context?.billing_address?.last_name || context?.customer?.last_name;
      let customerAddress1 = context?.shipping_address?.address_1 || context?.billing_address?.address_1;
      let customerCity = context?.shipping_address?.city || context?.billing_address?.city;
      let customerCountryCode = context?.shipping_address?.country_code || context?.billing_address?.country_code;

      let dbClient: any;
      try {
        dbClient = new pg.Client({
          connectionString: process.env.DATABASE_URL,
        });
        await dbClient.connect();

        if (cartIdOrOrderId) {
          if (cartIdOrOrderId.startsWith("ord_")) {
            this.logger.info(`[N-Genius Service] Resolving retry payment for order: ${cartIdOrOrderId}`);
            const orderRes = await dbClient.query(`
              SELECT o.email, o.metadata,
                     s.first_name AS s_first_name, s.last_name AS s_last_name, s.address_1 AS s_address_1, s.city AS s_city, s.country_code AS s_country_code, s.phone AS s_phone,
                     b.first_name AS b_first_name, b.last_name AS b_last_name, b.address_1 AS b_address_1, b.city AS b_city, b.country_code AS b_country_code, b.phone AS b_phone
              FROM "order" o
              LEFT JOIN order_address s ON o.shipping_address_id = s.id
              LEFT JOIN order_address b ON o.billing_address_id = b.id
              WHERE o.id = $1 AND o.deleted_at IS NULL
            `, [cartIdOrOrderId]);

            if (orderRes.rows.length > 0) {
              const row = orderRes.rows[0];
              if (!customerEmail && row.email) customerEmail = row.email;
              const phoneVal = row.s_phone || row.b_phone;
              if (!customerPhone && phoneVal) customerPhone = phoneVal;
              if (!customerFirstName) customerFirstName = row.s_first_name || row.b_first_name;
              if (!customerLastName) customerLastName = row.s_last_name || row.b_last_name;
              if (!customerAddress1) customerAddress1 = row.s_address_1 || row.b_address_1;
              if (!customerCity) customerCity = row.s_city || row.b_city;
              if (!customerCountryCode) customerCountryCode = row.s_country_code || row.b_country_code;

              if (row.metadata?.order_number) {
                orderReference = row.metadata.order_number;
                this.logger.info(`[N-Genius Service] Found friendly order number in order metadata: ${orderReference}`);
              }
            }
          } else if (cartIdOrOrderId.startsWith("cart_")) {
            this.logger.info(`[N-Genius Service] Resolving payment for cart: ${cartIdOrOrderId}`);
            const cartRes = await dbClient.query(`
              SELECT c.email, c.metadata,
                     s.first_name AS s_first_name, s.last_name AS s_last_name, s.address_1 AS s_address_1, s.city AS s_city, s.country_code AS s_country_code, s.phone AS s_phone,
                     b.first_name AS b_first_name, b.last_name AS b_last_name, b.address_1 AS b_address_1, b.city AS b_city, b.country_code AS b_country_code, b.phone AS b_phone
              FROM cart c
              LEFT JOIN cart_address s ON c.shipping_address_id = s.id
              LEFT JOIN cart_address b ON c.billing_address_id = b.id
              WHERE c.id = $1 AND c.deleted_at IS NULL
            `, [cartIdOrOrderId]);

            if (cartRes.rows.length > 0) {
              const row = cartRes.rows[0];
              if (!customerEmail && row.email) customerEmail = row.email;
              const phoneVal = row.s_phone || row.b_phone;
              if (!customerPhone && phoneVal) customerPhone = phoneVal;
              if (!customerFirstName) customerFirstName = row.s_first_name || row.b_first_name;
              if (!customerLastName) customerLastName = row.s_last_name || row.b_last_name;
              if (!customerAddress1) customerAddress1 = row.s_address_1 || row.b_address_1;
              if (!customerCity) customerCity = row.s_city || row.b_city;
              if (!customerCountryCode) customerCountryCode = row.s_country_code || row.b_country_code;

              if (row.metadata?.order_number) {
                orderReference = row.metadata.order_number;
                this.logger.info(`[N-Genius Service] Found friendly order number in cart metadata: ${orderReference}`);
              } else {
                const maxOrderRes = await dbClient.query('SELECT COALESCE(MAX(display_id), 0) AS max_id FROM "order"');
                let nextDisplayId = Number(maxOrderRes.rows[0].max_id) + 1;

                const otherCartsRes = await dbClient.query(`
                  SELECT metadata->>'order_number' AS order_number 
                  FROM cart 
                  WHERE metadata->>'order_number' IS NOT NULL 
                    AND id != $1 
                    AND deleted_at IS NULL
                `, [cartIdOrOrderId]);

                let maxPreAllocated = 0;
                for (const otherRow of otherCartsRes.rows) {
                  const match = String(otherRow.order_number || "").match(/ORD-OL\d+-(\d+)/);
                  if (match) {
                    const val = parseInt(match[1], 10);
                    if (val > maxPreAllocated) maxPreAllocated = val;
                  }
                }

                if (maxPreAllocated >= nextDisplayId) {
                  nextDisplayId = maxPreAllocated + 1;
                }

                const yy = String(new Date().getFullYear()).slice(-2);
                const displayIdStr = String(nextDisplayId).padStart(4, '0');
                orderReference = `ORD-OL${yy}-${displayIdStr}`;

                this.logger.info(`[N-Genius Service] Pre-allocated friendly order number: ${orderReference}`);

                const updatedCartMetadata = {
                  ...(row.metadata || {}),
                  order_number: orderReference,
                };
                await dbClient.query(
                  "UPDATE cart SET metadata = $1, updated_at = NOW() WHERE id = $2",
                  [JSON.stringify(updatedCartMetadata), cartIdOrOrderId]
                );
              }
            }
          }
        }
      } catch (dbErr: any) {
        this.logger.warn(`[N-Genius Service] Database helper error: ${dbErr.message}`);
      } finally {
        if (dbClient) {
          try { await dbClient.end(); } catch {}
        }
      }

      if (!orderReference) {
        const resourceId = input.resource_id || context?.resource_id || context?.payment_collection_id || data?.resource_id || `mc-${Date.now()}`;
        orderReference = String(resourceId).replace(/_/g, "-");
        this.logger.info(`[N-Genius Service] Fallback orderReference constructed: ${orderReference}`);
      }

      this.logger.info(
        `[N-Genius Service] Initiating payment for resource reference: ${orderReference}, Amount: ${parsedAmount} ${currency_code}`
      );




      const cleanPhone = (phone: string | undefined): string | undefined => {
        if (!phone) return undefined;
        const cleaned = phone.replace(/[^\d+]/g, "");
        return cleaned.length >= 7 ? cleaned : undefined;
      };

      const billingAddressPayload = {
        firstName: String(customerFirstName || "Customer").trim(),
        lastName: String(customerLastName || "N/A").trim(),
        address1: String(customerAddress1 || "N/A").trim(),
        city: String(customerCity || "Dubai").trim(),
        countryCode: String(customerCountryCode || "AE").trim().toUpperCase(),
        phoneNumber: cleanPhone(customerPhone) || "N/A",
      };

      // Construct redirectParam using friendly order number
      const redirectParam = `id=${orderReference}`;

      const orderResponse = await this.client.createOrder(
        parsedAmount,
        currency_code,
        orderReference,
        customerEmail,
        redirectParam,
        billingAddressPayload
      );

      const paymentUrl = orderResponse._links?.payment?.href;

      return {
        id: orderResponse.reference,
        status: "pending",
        data: sanitizeNGeniusData({
          id: orderResponse.reference,
          reference: orderResponse.reference,
          payment_url: paymentUrl,
          amount,
          currency_code,
          status: orderResponse.status || "STARTED",
          ...orderResponse,
        }),
      };
    } catch (error: any) {
      this.logger.error(`[N-Genius Service] Initiate payment failed. Error: ${error.message}`);
      return {
        error: error.message || "Failed to initiate payment",
        code: "initiate_failed",
        detail: error,
      };
    }
  }

  /**
   * Authorize a payment session by checking N-Genius status.
   */
  async authorizePayment(input: any): Promise<any> {
    try {
      this.logger.info(`[N-Genius Service] authorizePayment input: ${JSON.stringify(input)}`);
      const sessionData = input.data || input.paymentSessionData || input || {};
      const reference = sessionData.reference || sessionData.id;
      this.logger.info(`[N-Genius Service] Authorizing payment session for reference: ${reference}`);

      if (!reference) {
        throw new Error("No N-Genius order reference found in payment session.");
      }

      // Fetch the order status from N-Genius
      const statusResponse = await this.client.getOrderStatus(reference);
      const medusaStatus = this.mapNGeniusStatusToMedusa(statusResponse);

      this.logger.info(
        `[NGENIUS RAW RESPONSE] ${JSON.stringify(statusResponse, null, 2)}`
      );
      this.logger.info(
        `[NGENIUS MAPPED STATUS] ${medusaStatus}`
      );

      // Return "authorized" for captured, authorized, or pending (to allow checkout completion & redirect)
      if (medusaStatus === "captured" || medusaStatus === "authorized" || medusaStatus === "pending") {
        return {
          status: "authorized",
          data: sanitizeNGeniusData({
            ...sessionData,
            ...statusResponse,
            status: statusResponse.status,
          }),
        };
      }

      // If payment has failed/declined
      if (medusaStatus === "error") {
        return {
          status: "error",
          error: "Payment declined or failed in N-Genius",
          code: "payment_declined",
          data: sanitizeNGeniusData({
            ...sessionData,
            ...statusResponse,
          }),
        };
      }

      return {
        status: "requires_more",
        data: sanitizeNGeniusData({
          ...sessionData,
          ...statusResponse,
        }),
      };
    } catch (error: any) {
      this.logger.error(`[N-Genius Service] Authorize payment failed. Error: ${error.message}`);
      return {
        error: error.message || "Failed to authorize payment",
        code: "authorize_failed",
        detail: error,
      };
    }
  }

  /**
   * Finalize/Capture a payment.
   */
  async capturePayment(input: any): Promise<any> {
    try {
      this.logger.info(`[N-Genius Service] capturePayment input: ${JSON.stringify(input)}`);
      const sessionData = input.data || input.paymentSessionData || input || {};
      const reference = sessionData.reference || sessionData.id;
      this.logger.info(`[N-Genius Service] Capturing payment for reference: ${reference}`);

      if (!reference) {
        throw new Error("No N-Genius order reference found in payment session.");
      }

      // Retrieve state from N-Genius
      const statusResponse = await this.client.getOrderStatus(reference);
      const medusaStatus = this.mapNGeniusStatusToMedusa(statusResponse);

      if (medusaStatus !== "captured" && medusaStatus !== "authorized") {
        throw new Error(`Cannot capture payment in state: ${medusaStatus}`);
      }

      return {
        data: sanitizeNGeniusData({
          ...sessionData,
          ...statusResponse,
          captured_at: new Date().toISOString(),
        }),
      };
    } catch (error: any) {
      this.logger.error(`[N-Genius Service] Capture payment failed. Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel/Void an authorized payment.
   */
  async cancelPayment(input: any): Promise<any> {
    try {
      this.logger.info(`[N-Genius Service] cancelPayment input: ${JSON.stringify(input)}`);
      const sessionData = input.data || input.paymentSessionData || input || {};
      const reference = sessionData.reference || sessionData.id;
      this.logger.info(`[N-Genius Service] Canceling payment for reference: ${reference}`);

      if (!reference) {
        throw new Error("No N-Genius order reference found in payment session.");
      }

      // TODO: Call official cancel order API once documentation is received.
      return {
        data: sanitizeNGeniusData({
          ...sessionData,
          status: "CANCELED",
          canceled_at: new Date().toISOString(),
        }),
      };
    } catch (error: any) {
      this.logger.error(`[N-Genius Service] Cancel payment failed. Error: ${error.message}`);
      return {
        error: error.message || "Failed to cancel payment",
        code: "cancel_failed",
        detail: error,
      };
    }
  }

  /**
   * Refund a captured payment.
   */
  async refundPayment(input: any): Promise<any> {
    try {
      this.logger.info(`[N-Genius Service] refundPayment input: ${JSON.stringify(input)}`);
      const sessionData = input.data || input.paymentSessionData || input || {};
      const reference = sessionData.reference || sessionData.id;

      let amountValue = input.refundAmount || input.amount || 0;
      if (typeof amountValue === "object" && amountValue !== null) {
        amountValue = amountValue.value ?? amountValue.raw?.value ?? amountValue;
      }
      const parsedRefundAmount = Math.round(Number(amountValue));
      
      const currency = sessionData.currency_code || "AED";
      this.logger.info(
        `[N-Genius Service] Refunding payment for reference: ${reference}, Amount: ${parsedRefundAmount} ${currency}`
      );

      if (!reference) {
        throw new Error("No N-Genius order reference found in payment session.");
      }

      const refundResponse = await this.client.refundPayment(reference, parsedRefundAmount, currency);

      return {
        data: sanitizeNGeniusData({
          ...sessionData,
          refund: refundResponse,
          refunded_at: new Date().toISOString(),
        }),
      };
    } catch (error: any) {
      this.logger.error(`[N-Genius Service] Refund payment failed. Error: ${error.message}`);
      return {
        error: error.message || "Failed to refund payment",
        code: "refund_failed",
        detail: error,
      };
    }
  }

  /**
   * Retrieve session data from payment gateway.
   */
  async retrievePayment(input: any): Promise<any> {
    try {
      this.logger.info(`[N-Genius Service] retrievePayment input: ${JSON.stringify(input)}`);
      const sessionData = input.data || input.paymentSessionData || input || {};
      const reference = sessionData.reference || sessionData.id;
      this.logger.info(`[N-Genius Service] Retrieving payment data for reference: ${reference}`);

      if (!reference) {
        throw new Error("No N-Genius order reference found in payment session.");
      }

      const statusResponse = await this.client.getOrderStatus(reference);
      return {
        data: sanitizeNGeniusData({
          ...sessionData,
          ...statusResponse,
        }),
      };
    } catch (error: any) {
      this.logger.error(`[N-Genius Service] Retrieve payment failed. Error: ${error.message}`);
      return {
        error: error.message || "Failed to retrieve payment",
        code: "retrieve_failed",
        detail: error,
      };
    }
  }

  /**
   * Map N-Genius statuses to Medusa's PaymentSessionStatus.
   */
  async getPaymentStatus(input: any): Promise<any> {
    try {
      this.logger.info(`[N-Genius Service] getPaymentStatus input: ${JSON.stringify(input)}`);
      const sessionData = input.data || input.paymentSessionData || input || {};
      const reference = sessionData.reference || sessionData.id;
      if (!reference) {
        return "pending";
      }

      const statusResponse = await this.client.getOrderStatus(reference);
      return this.mapNGeniusStatusToMedusa(statusResponse);
    } catch {
      return "error";
    }
  }

  /**
   * Delete a payment session.
   */
  async deletePayment(input: any): Promise<any> {
    this.logger.info(`[N-Genius Service] deletePayment input: ${JSON.stringify(input)}`);
    const sessionData = input.data || input.paymentSessionData || input || {};
    this.logger.info(
      `[N-Genius Service] Delete payment session requested for reference: ${sessionData.reference || sessionData.id}`
    );
    return {
      data: sessionData,
    };
  }

  /**
   * Update an existing payment session (e.g. when cart amounts change).
   */
  async updatePayment(input: any): Promise<any> {
    this.logger.info(`[N-Genius Service] updatePayment input: ${JSON.stringify(input)}`);
    const result = await this.initiatePayment(input);
    return {
      status: result.status,
      data: result.data,
    };
  }

  /**
   * Process webhook events received from the N-Genius gateway.
   * Maps payment status updates to Medusa's internal PaymentActions.
   */
  async getWebhookActionAndData(input: any): Promise<any> {
    this.logger.info(`[N-Genius Service] getWebhookActionAndData input: ${JSON.stringify(input)}`);
    
    // Medusa passes request payload/body to input
    const payload = input?.body || input || {};
    
    // Extract N-Genius order reference (UUID)
    const reference = payload.data?.order?.reference || payload.order?.reference || payload.reference || payload.orderReference || payload.order_reference;
    
    // Extract amount details
    const amountObj = payload.data?.order?.amount || payload.amount;
    let amount = 0;
    if (typeof amountObj === "object" && amountObj !== null) {
      amount = amountObj.value || amountObj.amount || 0;
    } else if (typeof amountObj === "number") {
      amount = amountObj;
    }

    if (!reference) {
      this.logger.warn("[N-Genius Service] Webhook received without valid order reference.");
      return {
        action: "not_supported",
        data: {},
      };
    }

    // Determine the event type
    const event = String(payload.event || payload.type || payload.status || "").toLowerCase();
    this.logger.info(`[N-Genius Service] Processing webhook event: ${event} for reference: ${reference}`);

    let action = "not_supported";
    if (event.includes("captured") || event.includes("purchased") || event.includes("success")) {
      action = "captured";
    } else if (event.includes("authorized") || event.includes("auth")) {
      action = "authorized";
    } else if (event.includes("failed") || event.includes("declined") || event.includes("rejected")) {
      action = "failed";
    } else if (event.includes("cancelled") || event.includes("canceled")) {
      action = "canceled";
    } else if (event.includes("pending")) {
      action = "pending";
    }

    return {
      action,
      data: {
        session_id: reference,
        amount,
      },
    };
  }

  /**
   * Mapping logic helper to convert N-Genius payment status to Medusa's internal strings.
   */
  private mapNGeniusStatusToMedusa(statusResponse: any): string {
    // 1. Inspect payments array inside _embedded if present
    const payments = statusResponse._embedded?.payment;
    if (Array.isArray(payments) && payments.length > 0) {
      // Access the latest chronological payment attempt at the end of the array
      const latestPayment = payments[payments.length - 1];
      const state = latestPayment.status || latestPayment.state;
      if (state) {
        const cleanState = String(state).toUpperCase();
        if (["CAPTURED", "PURCHASED", "SUCCESS"].includes(cleanState)) {
          return "captured";
        }
        if (["AUTHORIZED", "AUTH"].includes(cleanState)) {
          return "authorized";
        }
        if (["FAILED", "DECLINED", "REJECTED"].includes(cleanState)) {
          return "error";
        }
        if (["CANCELLED", "CANCELED"].includes(cleanState)) {
          return "canceled";
        }
        if (["STARTED"].includes(cleanState)) {
          return "pending";
        }
      }
    }

    // 2. Fallback to outer status/state property
    const overallState = String(statusResponse.status || statusResponse.state || "").toUpperCase();
    if (["CAPTURED", "PURCHASED", "SUCCESS"].includes(overallState)) {
      return "captured";
    }
    if (["AUTHORIZED", "AUTH"].includes(overallState)) {
      return "authorized";
    }
    if (["FAILED", "DECLINED", "REJECTED"].includes(overallState)) {
      return "error";
    }
    if (["CANCELLED", "CANCELED"].includes(overallState)) {
      return "canceled";
    }
    if (["STARTED"].includes(overallState)) {
      return "pending";
    }

    return "pending";
  }
}
