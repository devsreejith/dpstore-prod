export const mockWebhookPayloads = {
  /**
   * Generates a successful transaction payload
   */
  paymentCaptured(reference: string, amountAed = 89.00): any {
    return {
      event: 'payment.captured',
      action: 'CAPTURED',
      orderReference: reference,
      amount: {
        value: Math.round(amountAed * 100), // N-Genius operates in cents/minor units
        currencyCode: 'AED',
      },
    };
  },

  /**
   * Generates a failed transaction payload
   */
  paymentFailed(reference: string, amountAed = 89.00): any {
    return {
      event: 'payment.failed',
      action: 'FAILED',
      orderReference: reference,
      amount: {
        value: Math.round(amountAed * 100),
        currencyCode: 'AED',
      },
    };
  },

  /**
   * Generates a cancelled transaction payload
   */
  paymentCancelled(reference: string, amountAed = 89.00): any {
    return {
      event: 'payment.cancelled',
      action: 'CANCELLED',
      orderReference: reference,
      amount: {
        value: Math.round(amountAed * 100),
        currencyCode: 'AED',
      },
    };
  },
};
