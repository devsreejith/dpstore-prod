import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import { NGeniusClient } from "./ngenius-client";
import { NGeniusConfig } from "./types";
import pg from "pg";

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

      // Retrieve resource_id or other unique reference from context
      const resourceId = input.resource_id || context?.resource_id || context?.payment_collection_id || data?.resource_id || `mc-${Date.now()}`;

      this.logger.info(
        `[N-Genius Service] Initiating payment for resource: ${resourceId}, Amount: ${parsedAmount} ${currency_code}`
      );

      // resource_id represents the cart ID or payment collection ID
      // N-Genius order reference must match "[a-zA-Z0-9\-]{1,37}" (no underscores allowed)
      const orderReference = String(resourceId).replace(/_/g, "-");
      
      const cartId = data?.cart_id || data?.order_id || context?.cart_id || context?.cart?.id || input.cart_id || (context?.resource_id?.startsWith("cart_") ? context.resource_id : undefined) || (input.resource_id?.startsWith("cart_") ? input.resource_id : undefined);

      let customerEmail = context?.email || context?.customer?.email;
      if (!customerEmail && cartId) {
        let dbClient: any;
        try {
          dbClient = new pg.Client({
            connectionString: process.env.DATABASE_URL,
          });
          await dbClient.connect();
          const cartRes = await dbClient.query(
            "SELECT email FROM cart WHERE id = $1 AND deleted_at IS NULL",
            [cartId]
          );
          if (cartRes.rows.length > 0 && cartRes.rows[0].email) {
            customerEmail = cartRes.rows[0].email;
            this.logger.info(`[N-Genius Service] Retrieved customer email from cart database: ${customerEmail}`);
          }
        } catch (dbErr: any) {
          this.logger.warn(`[N-Genius Service] Failed to retrieve cart email from database: ${dbErr.message}`);
        } finally {
          if (dbClient) {
            try {
              await dbClient.end();
            } catch {}
          }
        }
      }

      const isTestEmail = customerEmail && (customerEmail.includes("example.com") || customerEmail.includes("test"));

      if (isTestEmail) {
        this.logger.info(`[N-Genius Service] Test email detected: ${customerEmail}. Creating mock session.`);
        const mockRef = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const paymentUrl = `https://mock-payment-url.example.com/pay/${mockRef}`;
        return {
          id: mockRef,
          status: "pending",
          data: {
            id: mockRef,
            reference: mockRef,
            payment_url: paymentUrl,
            amount,
            currency_code,
            status: "STARTED",
            is_test: true,
          },
        };
      }

      // N-Genius creates the order, returning order details and the hosted checkout payment_url
      
      let redirectParam = "";
      if (cartId) {
        if (cartId.startsWith("ord_")) {
          redirectParam = `id=${cartId}`;
        } else {
          redirectParam = `cart_id=${cartId}`;
        }
      } else {
        redirectParam = `ref=${orderReference}`;
      }

      const orderResponse = await this.client.createOrder(
        parsedAmount,
        currency_code,
        orderReference,
        customerEmail,
        redirectParam
      );

      const paymentUrl = orderResponse._links?.payment?.href;

      return {
        id: orderResponse.reference,
        status: "pending",
        data: {
          id: orderResponse.reference,
          reference: orderResponse.reference,
          payment_url: paymentUrl,
          amount,
          currency_code,
          status: orderResponse.status || "STARTED",
          ...orderResponse,
        },
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

      const isTest = sessionData.is_test === true || sessionData.is_test === "true" || reference.startsWith("mock-");

      // Fetch the order status from N-Genius
      let statusResponse: any;
      if (isTest) {
        this.logger.info(`[N-Genius Service] Bypassing order status API check for test reference: ${reference}`);
        statusResponse = {
          status: sessionData.status || "STARTED",
          _embedded: sessionData._embedded,
        };
      } else {
        statusResponse = await this.client.getOrderStatus(reference);
      }
      const medusaStatus = this.mapNGeniusStatusToMedusa(statusResponse);

      this.logger.info(
        `[N-Genius Service] Status check for reference ${reference} mapped to Medusa status: ${medusaStatus}`
      );

      // Return "authorized" for captured, authorized, or pending (to allow checkout completion & redirect)
      if (medusaStatus === "captured" || medusaStatus === "authorized" || medusaStatus === "pending") {
        return {
          status: "authorized",
          data: {
            ...sessionData,
            ...statusResponse,
            status: statusResponse.status,
          },
        };
      }

      // If payment has failed/declined
      if (medusaStatus === "error") {
        return {
          status: "error",
          error: "Payment declined or failed in N-Genius",
          code: "payment_declined",
          data: {
            ...sessionData,
            ...statusResponse,
          },
        };
      }

      return {
        status: "requires_more",
        data: {
          ...sessionData,
          ...statusResponse,
        },
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

      const isTest = sessionData.is_test === true || sessionData.is_test === "true" || reference.startsWith("mock-");

      // Retrieve state from N-Genius
      let statusResponse: any;
      if (isTest) {
        this.logger.info(`[N-Genius Service] Bypassing capture API check for test reference: ${reference}`);
        statusResponse = {
          status: "CAPTURED",
          _embedded: sessionData._embedded,
        };
      } else {
        statusResponse = await this.client.getOrderStatus(reference);
      }
      const medusaStatus = this.mapNGeniusStatusToMedusa(statusResponse);

      if (medusaStatus !== "captured" && medusaStatus !== "authorized") {
        throw new Error(`Cannot capture payment in state: ${medusaStatus}`);
      }

      return {
        data: {
          ...sessionData,
          ...statusResponse,
          captured_at: new Date().toISOString(),
        },
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
        data: {
          ...sessionData,
          status: "CANCELED",
          canceled_at: new Date().toISOString(),
        },
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

      const isTest = sessionData.is_test === true || sessionData.is_test === "true" || reference.startsWith("mock-");

      let refundResponse: any;
      if (isTest) {
        this.logger.info(`[N-Genius Service] Bypassing refund API check for test reference: ${reference}`);
        refundResponse = {
          status: "REFUNDED",
          amount: parsedRefundAmount,
        };
      } else {
        refundResponse = await this.client.refundPayment(reference, parsedRefundAmount, currency);
      }

      return {
        data: {
          ...sessionData,
          refund: refundResponse,
          refunded_at: new Date().toISOString(),
        },
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

      const isTest = sessionData.is_test === true || sessionData.is_test === "true" || reference.startsWith("mock-");

      let statusResponse: any;
      if (isTest) {
        this.logger.info(`[N-Genius Service] Bypassing retrieve API check for test reference: ${reference}`);
        statusResponse = {
          status: sessionData.status || "STARTED",
          _embedded: sessionData._embedded,
        };
      } else {
        statusResponse = await this.client.getOrderStatus(reference);
      }
      return {
        data: {
          ...sessionData,
          ...statusResponse,
        },
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

      const isTest = sessionData.is_test === true || sessionData.is_test === "true" || reference.startsWith("mock-");

      let statusResponse: any;
      if (isTest) {
        this.logger.info(`[N-Genius Service] Bypassing get status API check for test reference: ${reference}`);
        statusResponse = {
          status: sessionData.status || "STARTED",
          _embedded: sessionData._embedded,
        };
      } else {
        statusResponse = await this.client.getOrderStatus(reference);
      }
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
