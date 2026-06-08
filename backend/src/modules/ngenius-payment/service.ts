import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import { NGeniusClient } from "./ngenius-client";
import { NGeniusConfig } from "./types";

export class NGeniusPaymentService extends AbstractPaymentProvider<any> {
  static identifier = "ngenius";
  protected client: NGeniusClient;
  protected logger: any;

  constructor(container: any, options: NGeniusConfig) {
    super(container, options);
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
      const customerEmail = context?.email || context?.customer?.email;

      // N-Genius creates the order, returning order details and the hosted checkout payment_url
      const orderResponse = await this.client.createOrder(
        parsedAmount,
        currency_code,
        orderReference,
        customerEmail
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

      // Fetch the order status from N-Genius
      const statusResponse = await this.client.getOrderStatus(reference);
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
            status: statusResponse.status || "CAPTURED",
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

      // Retrieve state from N-Genius
      const statusResponse = await this.client.getOrderStatus(reference);
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
      return {
        error: error.message || "Failed to capture payment",
        code: "capture_failed",
        detail: error,
      };
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

      const refundResponse = await this.client.refundPayment(reference, parsedRefundAmount, currency);

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

      const statusResponse = await this.client.getOrderStatus(reference);
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
   * Process webhook events.
   * TODO: Map actual webhook events to Medusa actions once payloads are documented.
   */
  async getWebhookActionAndData(input: any): Promise<any> {
    this.logger.info(`[N-Genius Service] Webhook event received: ${JSON.stringify(input)}`);
    return {
      action: "not_supported",
      data: {},
    };
  }

  /**
   * Mapping logic helper to convert N-Genius payment status to Medusa's internal strings.
   */
  private mapNGeniusStatusToMedusa(statusResponse: any): string {
    // 1. Inspect payments array inside _embedded if present
    const payments = statusResponse._embedded?.payment;
    if (Array.isArray(payments) && payments.length > 0) {
      const latestPayment = payments[0];
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

    return "pending";
  }
}
