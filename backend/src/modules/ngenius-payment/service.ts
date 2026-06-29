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

function getDecimalDigits(currencyCode: string): number {
  const code = String(currencyCode || "").toUpperCase();
  // Currencies with 3 decimal places
  if (["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"].includes(code)) {
    return 3;
  }
  // Currencies with 0 decimal places
  if (["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VUV", "VND", "XAF", "XOF", "XPF"].includes(code)) {
    return 0;
  }
  // Default is 2 decimal places
  return 2;
}

function getAmountInMinorUnits(amount: number, currencyCode: string): number {
  const decimals = getDecimalDigits(currencyCode);
  return Math.round(amount * Math.pow(10, decimals));
}

function getAmountFromMinorUnits(amountMinor: number, currencyCode: string): number {
  const decimals = getDecimalDigits(currencyCode);
  return amountMinor / Math.pow(10, decimals);
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
      const minorAmount = getAmountInMinorUnits(Number(amountValue), currency_code);

      // Retrieve cart or order ID from input
      const cartIdOrOrderId = data?.cart_id || data?.order_id || context?.cart_id || context?.cart?.id || input.cart_id || 
        (context?.resource_id?.startsWith("cart_") ? context.resource_id : undefined) || 
        (input.resource_id?.startsWith("cart_") ? input.resource_id : undefined) || 
        (context?.resource_id?.startsWith("order_") ? context.resource_id : undefined) || 
        (context?.resource_id?.startsWith("ord_") ? context.resource_id : undefined) || 
        (input.resource_id?.startsWith("order_") ? input.resource_id : undefined) || 
        (input.resource_id?.startsWith("ord_") ? input.resource_id : undefined);

      let orderReference = "";
      let customerEmail = context?.email || context?.customer?.email;
      let customerPhone = context?.shipping_address?.phone || context?.billing_address?.phone || context?.customer?.phone;
      let customerFirstName = context?.shipping_address?.first_name || context?.billing_address?.first_name || context?.customer?.first_name;
      let customerLastName = context?.shipping_address?.last_name || context?.billing_address?.last_name || context?.customer?.last_name;
      let customerAddress1 = context?.shipping_address?.address_1 || context?.billing_address?.address_1;
      let customerCity = context?.shipping_address?.city || context?.billing_address?.city;
      let customerCountryCode = context?.shipping_address?.country_code || context?.billing_address?.country_code;

      let lineItems: any[] = [];
      let shippingAmountVal = 25.0; // Default flat rate
      let taxAmountVal = 0.0;
      let shipTaxRate = 0;

      let dbClient: any;
      try {
        dbClient = new pg.Client({
          connectionString: process.env.DATABASE_URL,
        });
        await dbClient.connect();

        if (cartIdOrOrderId) {
          if (cartIdOrOrderId.startsWith("order_") || cartIdOrOrderId.startsWith("ord_")) {
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

            // Fetch order items and quantities along with tax rates
            const itemsRes = await dbClient.query(`
              SELECT oli.title, oi.quantity, oli.unit_price,
                     COALESCE(
                       (SELECT SUM(rate) FROM order_line_item_tax_line tl WHERE tl.item_id = oli.id AND tl.deleted_at IS NULL),
                       0
                     ) AS tax_rate
              FROM order_item oi
              JOIN order_line_item oli ON oi.item_id = oli.id
              WHERE oi.order_id = $1 AND oi.deleted_at IS NULL AND oli.deleted_at IS NULL
            `, [cartIdOrOrderId]);
            lineItems = itemsRes.rows;

            // Fetch shipping amount and tax rate
            const shipRes = await dbClient.query(`
              SELECT osm.amount,
                     COALESCE(
                       (SELECT SUM(rate) FROM order_shipping_method_tax_line tl WHERE tl.shipping_method_id = osm.id AND tl.deleted_at IS NULL),
                       0
                     ) AS tax_rate
              FROM order_shipping os
              JOIN order_shipping_method osm ON os.shipping_method_id = osm.id
              WHERE os.order_id = $1 AND os.deleted_at IS NULL AND osm.deleted_at IS NULL
            `, [cartIdOrOrderId]);
            if (shipRes.rows.length > 0) {
              shippingAmountVal = Number(shipRes.rows[0].amount ?? 25);
              shipTaxRate = Number(shipRes.rows[0].tax_rate ?? 0);
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

            // Fetch cart line items along with tax rate
            const itemsRes = await dbClient.query(`
              SELECT cli.title, cli.quantity, cli.unit_price,
                     COALESCE(
                       (SELECT SUM(rate) FROM cart_line_item_tax_line tl WHERE tl.item_id = cli.id AND tl.deleted_at IS NULL),
                       0
                     ) AS tax_rate
              FROM cart_line_item cli
              WHERE cli.cart_id = $1 AND cli.deleted_at IS NULL
            `, [cartIdOrOrderId]);
            lineItems = itemsRes.rows;

            // Fetch cart shipping methods along with tax rate
            const shipRes = await dbClient.query(`
              SELECT csm.amount,
                     COALESCE(
                       (SELECT SUM(rate) FROM cart_shipping_method_tax_line tl WHERE tl.shipping_method_id = csm.id AND tl.deleted_at IS NULL),
                       0
                     ) AS tax_rate
              FROM cart_shipping_method csm
              WHERE csm.cart_id = $1 AND csm.deleted_at IS NULL
            `, [cartIdOrOrderId]);
            if (shipRes.rows.length > 0) {
              shippingAmountVal = Number(shipRes.rows[0].amount ?? 25);
              shipTaxRate = Number(shipRes.rows[0].tax_rate ?? 0);
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
        `[N-Genius Service] Initiating payment for resource reference: ${orderReference}, Amount: ${amountValue} (Minor: ${minorAmount}) ${currency_code}`
      );

      // Format item descriptions for N-Genius order details
      let description = "";
      let cartObjPayload: any = undefined;
      let orderObjPayload: any = undefined;
      let orderSummaryObj: any = undefined;

      if (lineItems.length > 0) {
        const totalQty = lineItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
        
        // Calculate subtotal of items
        const subtotalVal = lineItems.reduce(
          (sum, item) => sum + (Number(item.unit_price) * Number(item.quantity || 1)),
          0
        );

        // Calculate dynamic tax amount from line items and shipping tax lines
        taxAmountVal = 0;
        for (const item of lineItems) {
          const itemQty = Number(item.quantity || 1);
          const itemPrice = Number(item.unit_price || 0);
          const itemTaxRate = Number(item.tax_rate || 0);
          if (itemTaxRate > 0) {
            taxAmountVal += (itemPrice * itemQty) * (itemTaxRate / 100);
          }
        }
        if (shippingAmountVal > 0 && shipTaxRate > 0) {
          taxAmountVal += shippingAmountVal * (shipTaxRate / 100);
        }

        description += `▼ ${totalQty} Item${totalQty !== 1 ? "s" : ""}\n\n`;
        for (const item of lineItems) {
          const itemTotal = Number(item.unit_price) * Number(item.quantity || 1);
          // Capitalize start of each word (Title Case)
          const title = String(item.title || item.product_title || "")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
          
          description += `${title} ×${item.quantity || 1}    AED ${itemTotal.toFixed(2)}\n`;
        }
        description += `\nDelivery Charge         AED ${shippingAmountVal.toFixed(2)}`;
        if (taxAmountVal > 0) {
          description += `\nVAT (5%)                AED ${taxAmountVal.toFixed(2)}`;
        }

        // Build structured cart payload
        const cartItems = lineItems.map((item) => ({
          name: String(item.title || item.product_title || "")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" "),
          quantity: Number(item.quantity || 1),
          unitPrice: Math.round(Number(item.unit_price) * 100), // Minor units
          totalAmount: Math.round(Number(item.unit_price) * Number(item.quantity || 1) * 100)
        }));

        if (shippingAmountVal > 0) {
          cartItems.push({
            name: "Delivery Charge",
            quantity: 1,
            unitPrice: Math.round(shippingAmountVal * 100),
            totalAmount: Math.round(shippingAmountVal * 100)
          });
        }

        if (taxAmountVal > 0) {
          cartItems.push({
            name: "VAT (5%)",
            quantity: 1,
            unitPrice: Math.round(taxAmountVal * 100),
            totalAmount: Math.round(taxAmountVal * 100)
          });
        }

        cartObjPayload = {
          items: cartItems
        };

        orderObjPayload = {
          items: cartItems.map((c) => ({
            name: c.name,
            quantity: c.quantity,
            unitPrice: c.unitPrice
          }))
        };

        const orderSummaryItems = lineItems.map((item) => ({
          category: "Products",
          description: String(item.title || item.product_title || "")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" "),
          quantity: Number(item.quantity || 1),
          totalPrice: {
            currencyCode: currency_code.toUpperCase(),
            value: Math.round(Number(item.unit_price) * Number(item.quantity || 1) * 100)
          }
        }));

        if (shippingAmountVal > 0) {
          orderSummaryItems.push({
            category: "Shipping",
            description: "Delivery Charge",
            quantity: 1,
            totalPrice: {
              currencyCode: currency_code.toUpperCase(),
              value: Math.round(shippingAmountVal * 100)
            }
          });
        }

        if (taxAmountVal > 0) {
          orderSummaryItems.push({
            category: "Taxes",
            description: "VAT (5%)",
            quantity: 1,
            totalPrice: {
              currencyCode: currency_code.toUpperCase(),
              value: Math.round(taxAmountVal * 100)
            }
          });
        }

        orderSummaryObj = {
          total: {
            currencyCode: currency_code.toUpperCase(),
            value: minorAmount
          },
          items: orderSummaryItems
        };
      }

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

      // Construct redirectParam using cart ID to allow secure guest order retrieval on storefront return
      const redirectParam = cartIdOrOrderId && cartIdOrOrderId.startsWith("cart_")
        ? `cart_id=${cartIdOrOrderId}`
        : `id=${orderReference}`;

      const orderResponse = await this.client.createOrder(
        minorAmount,
        currency_code,
        orderReference,
        customerEmail,
        redirectParam,
        billingAddressPayload,
        {
          description: description || undefined,
          merchantAttributes: {
            skipConfirmationPage: false,
            ...(description ? { description } : {})
          },
          cart: cartObjPayload,
          order: orderObjPayload,
          categorizedOrderSummary: true,
          orderSummary: orderSummaryObj
        }
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
      
      const currency = sessionData.currency_code || "AED";
      const minorRefundAmount = getAmountInMinorUnits(Number(amountValue), currency);

      this.logger.info(
        `[N-Genius Service] Refunding payment for reference: ${reference}, Amount: ${amountValue} (Minor: ${minorRefundAmount}) ${currency}`
      );

      if (!reference) {
        throw new Error("No N-Genius order reference found in payment session.");
      }

      const refundResponse = await this.client.refundPayment(reference, minorRefundAmount, currency);

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
    const currency = amountObj?.currencyCode || payload.data?.order?.amount?.currencyCode || payload.data?.order?.currencyCode || payload.currency || "AED";
    let amount = 0;
    if (typeof amountObj === "object" && amountObj !== null) {
      const rawAmount = amountObj.value || amountObj.amount || 0;
      amount = getAmountFromMinorUnits(rawAmount, currency);
    } else if (typeof amountObj === "number") {
      amount = getAmountFromMinorUnits(amountObj, currency);
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
