import { NGeniusConfig, CreateOrderRequest, CreateOrderResponse, PaymentStatusResponse, RefundResponse } from "./types";

export class NGeniusClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private apiKey: string;
  private merchantId: string;
  private outletId: string;
  private tokenUrl: string;
  private transactionUrl: string;
  private successUrl: string;
  private failureUrl: string;
  private cancelUrl: string;
  private logger?: any;

  constructor(config: NGeniusConfig, logger?: any) {
    this.logger = logger;
    this.validateConfig(config);

    const cleanStr = (val: any): string => {
      if (!val) return "";
      let s = String(val).trim();
      if (s.startsWith('"') && s.endsWith('"')) {
        s = s.slice(1, -1);
      }
      if (s.startsWith("'") && s.endsWith("'")) {
        s = s.slice(1, -1);
      }
      return s.trim();
    };

    this.apiKey = cleanStr(config.apiKey);
    this.merchantId = cleanStr(config.merchantId);
    this.outletId = cleanStr(config.outletId);
    this.tokenUrl = cleanStr(config.tokenUrl);
    this.transactionUrl = cleanStr(config.transactionUrl);
    this.successUrl = cleanStr(config.successUrl);
    this.failureUrl = cleanStr(config.failureUrl);
    this.cancelUrl = cleanStr(config.cancelUrl);
  }

  /**
   * Validate that all required configuration values are present.
   */
  private validateConfig(config: NGeniusConfig): void {
    const requiredKeys: Array<keyof NGeniusConfig> = [
      "apiKey",
      "merchantId",
      "outletId",
      "tokenUrl",
      "transactionUrl",
    ];

    const missingKeys = requiredKeys.filter((key) => !config[key]);

    if (missingKeys.length > 0) {
      const errorMsg = `[N-Genius Client] Missing configuration variables: ${missingKeys.join(", ")}`;
      this.logger?.error?.(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Helper to execute API calls with exponential backoff retries.
   */
  private async requestWithRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries <= 0) {
        this.logger?.error?.(
          `[N-Genius Client] Request failed permanently after all retries. Error: ${error.message}`
        );
        throw error;
      }
      this.logger?.warn?.(
        `[N-Genius Client] Request failed. Retrying in ${delay}ms... Remaining retries: ${retries}. Error: ${error.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.requestWithRetry(fn, retries - 1, delay * 2);
    }
  }

  /**
   * Fetch a bearer access token, caching it in memory.
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    // Cache access token; subtract 60s buffer
    if (this.accessToken && this.tokenExpiresAt && now < this.tokenExpiresAt - 60000) {
      this.logger?.info?.("[N-Genius Client] Using cached access token.");
      return this.accessToken;
    }

    this.logger?.info?.("[N-Genius Client] Fetching new access token...");
    const data = await this.requestWithRetry(async () => {
      const response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${this.apiKey}`,
          "Content-Type": "application/vnd.ni-identity.v1+json",
          "Accept": "application/vnd.ni-identity.v1+json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Auth failed with status ${response.status}: ${errText}`);
      }

      return response.json() as Promise<{ access_token: string; expires_in?: number }>;
    });

    this.accessToken = data.access_token;
    // N-Genius tokens expire in 300 seconds (5 minutes) by default
    const expiresIn = data.expires_in ?? 300;
    this.tokenExpiresAt = Date.now() + expiresIn * 1000;
    this.logger?.info?.("[N-Genius Client] Access token retrieved and cached successfully.");
    return this.accessToken;
  }

  async createOrder(
    amountMinor: number,
    currencyCode: string,
    orderReference: string,
    customerEmail?: string,
    redirectParam?: string,
    billingAddress?: {
      firstName: string;
      lastName: string;
      address1: string;
      city: string;
      countryCode: string;
      phoneNumber?: string;
    },
    extraPayload?: any
  ): Promise<CreateOrderResponse> {
    this.logger?.info?.(
      `[N-Genius Client] Creating order redirect session. Ref: ${orderReference}, redirectParam: ${redirectParam}, Amount: ${amountMinor} ${currencyCode}, BillingAddress: ${JSON.stringify(billingAddress)}`
    );

    const token = await this.getAccessToken();
    const url = this.transactionUrl.replace(/{OUTLET_ID}/i, this.outletId);

    const redirectUrl = this.successUrl
      ? `${this.successUrl}${this.successUrl.includes("?") ? "&" : "?"}${redirectParam || `ref=${orderReference}`}`
      : undefined;

    this.logger?.info?.(`[N-Genius Client] Constructed redirectUrl: ${redirectUrl}`);

    const payload: CreateOrderRequest = {
      action: "SALE",
      amount: {
        currencyCode: currencyCode.toUpperCase(),
        value: amountMinor,
      },
      merchantOrderReference: orderReference,
      emailAddress: customerEmail,
      billingAddress: billingAddress ? {
        firstName: billingAddress.firstName || "Customer",
        lastName: billingAddress.lastName || "N/A",
        address1: billingAddress.address1 || "N/A",
        city: billingAddress.city || "Dubai",
        countryCode: (billingAddress.countryCode || "AE").toUpperCase(),
        phoneNumber: billingAddress.phoneNumber && billingAddress.phoneNumber !== "N/A" ? billingAddress.phoneNumber : undefined,
      } : undefined,
      ...(extraPayload || {}),
      merchantAttributes: {
        ...(extraPayload?.merchantAttributes || {}),
        ...(redirectUrl ? { redirectUrl } : {})
      }
    };

    const logMsg = `[N-Genius Client] Request payload sent to N-Genius order API:\n${JSON.stringify(payload, null, 2)}`;
    console.log(logMsg);
    this.logger?.info?.(logMsg);

    const data = await this.requestWithRetry(async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/vnd.ni-payment.v2+json",
          "Accept": "application/vnd.ni-payment.v2+json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Create order failed with status ${response.status}: ${errText}`);
      }

      return response.json() as Promise<CreateOrderResponse>;
    });

    this.logger?.info?.(`[N-Genius Client] Order created successfully. Reference: ${data.reference}`);
    return data;
  }

  /**
   * Fetch order status from N-Genius.
   */
  async getOrderStatus(orderReference: string): Promise<PaymentStatusResponse> {
    this.logger?.info?.(`[N-Genius Client] Checking status for order ref: ${orderReference}`);

    const token = await this.getAccessToken();
    const baseUrl = this.transactionUrl.replace(/{OUTLET_ID}/i, this.outletId);
    const url = `${baseUrl}/${orderReference}`;

    const data = await this.requestWithRetry(async () => {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.ni-payment.v2+json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Get order status failed with status ${response.status}: ${errText}`);
      }

      return response.json() as Promise<PaymentStatusResponse>;
    });

    this.logger?.info?.(`[N-Genius Client] Status checked successfully for order ref: ${orderReference}`);
    return data;
  }

  /**
   * Refund a captured payment in N-Genius.
   * TODO: Update request/response schema once official Refund API documentation is received.
   */
  async refundPayment(
    orderReference: string,
    amountMinor: number,
    currencyCode: string
  ): Promise<RefundResponse> {
    this.logger?.info?.(
      `[N-Genius Client] Initiating refund. Ref: ${orderReference}, Amount: ${amountMinor} ${currencyCode}`
    );

    const token = await this.getAccessToken();
    const baseUrl = this.transactionUrl.replace(/{OUTLET_ID}/i, this.outletId);
    // TODO: Confirm the exact refund endpoint structure from N-Genius docs.
    const url = `${baseUrl}/${orderReference}/refund`;

    const payload = {
      amount: {
        currencyCode: currencyCode.toUpperCase(),
        value: amountMinor,
      },
      // TODO: Add other required official refund fields.
    };

    const data = await this.requestWithRetry(async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/vnd.ni-payment.v2+json",
          "Accept": "application/vnd.ni-payment.v2+json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Refund failed with status ${response.status}: ${errText}`);
      }

      return response.json() as Promise<RefundResponse>;
    });

    this.logger?.info?.(`[N-Genius Client] Refund created successfully. Reference: ${data.reference}`);
    return data;
  }
}
