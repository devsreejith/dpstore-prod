/**
 * Placeholder interfaces for N-Genius Online API payloads.
 * DO NOT invent undocumented fields. Add details here once official documentation is received.
 */

export interface CreateOrderRequest {
  action: "SALE" | "AUTH";
  amount: {
    currencyCode: string;
    value: number; // Amount in minor units (e.g., AED 100.00 = 10000) or standard units
  };
  emailAddress?: string;
  merchantOrderReference?: string;
  // TODO: Add billing/shipping address, capture type, and other fields once official API documentation is received.
  [key: string]: any; 
}

export interface CreateOrderResponse {
  _links?: {
    payment?: {
      href: string; // The hosted checkout URL to redirect the customer to
    };
    [key: string]: any;
  };
  reference?: string; // N-Genius order reference
  // TODO: Add other response fields (e.g., outletId, status, amount) once official documentation is received.
  [key: string]: any;
}

export interface PaymentStatusResponse {
  reference?: string;
  _embedded?: {
    payment?: Array<{
      status: string;
      amount?: {
        currencyCode: string;
        value: number;
      };
      [key: string]: any;
    }>;
  };
  // TODO: Add official status schema and transition states once official documentation is received.
  [key: string]: any;
}

export interface RefundResponse {
  reference?: string;
  status?: string;
  // TODO: Add official refund response schema once official documentation is received.
  [key: string]: any;
}

export interface NGeniusConfig {
  apiKey: string;
  merchantId: string;
  outletId: string;
  tokenUrl: string;
  transactionUrl: string;
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
}
