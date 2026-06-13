import { medusaHelpers, storeApi } from '../helpers/medusa-client';
import axios from 'axios';
import { env } from '../config/env';
import { mockWebhookPayloads } from '../test-data/payloads';

describe('Medusa.js v2 N-Genius Payment Flow Tests', () => {
  let variantId: string;

  beforeAll(async () => {
    const variantInfo = await medusaHelpers.getTestProductVariantId();
    variantId = variantInfo.variantId;
  });

  test('Successful Payment Scenario - Should verify PAID status on database', async () => {
    // 1. Setup cart and checkout
    const cart = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cart.id, variantId, 1);
    await medusaHelpers.setShippingAddress(cart.id);
    await medusaHelpers.applyShipping(cart.id);
    
    // 2. Initialize payment session
    const { session } = await medusaHelpers.createPaymentSession(cart.id, 'pp_ngenius_ngenius');
    const orderReference = session.data.reference || session.data.id;
    
    // 3. Complete checkout to create order
    const result = await medusaHelpers.completeCart(cart.id);
    const orderId = result.order.id;

    // Verify order exists but payment is not captured yet
    let orderDb = await medusaHelpers.getDbOrder(orderId);
    expect(orderDb).toBeDefined();
    
    let pcDb = await medusaHelpers.getDbPaymentCollectionByOrderId(orderId);
    expect(Number(pcDb.captured_amount)).toBe(0);

    // 4. Simulate a successful payment webhook
    const payload = mockWebhookPayloads.paymentCaptured(orderReference, Number(result.order.total));
    const webhookRes = await axios.post(env.ngenius.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        [env.ngenius.webhookSecretKey]: env.ngenius.webhookSecretValue,
      },
    });
    expect(webhookRes.status).toBe(200);

    // 5. Query DB to verify payment captured and status updated
    pcDb = await medusaHelpers.getDbPaymentCollectionByOrderId(orderId);
    expect(pcDb.status).toBe('completed');
    expect(Number(pcDb.captured_amount)).toBe(Number(result.order.total));
  });

  test('Failed Payment Scenario (Declined) - Should verify order is not marked paid', async () => {
    const cart = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cart.id, variantId, 1);
    await medusaHelpers.setShippingAddress(cart.id);
    await medusaHelpers.applyShipping(cart.id);
    
    const { session } = await medusaHelpers.createPaymentSession(cart.id, 'pp_ngenius_ngenius');
    const orderReference = session.data.reference || session.data.id;
    
    const result = await medusaHelpers.completeCart(cart.id);
    const orderId = result.order.id;

    // Simulate failed payment webhook
    const payload = mockWebhookPayloads.paymentFailed(orderReference, Number(result.order.total));
    const webhookRes = await axios.post(env.ngenius.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        [env.ngenius.webhookSecretKey]: env.ngenius.webhookSecretValue,
      },
    });
    expect(webhookRes.status).toBe(200);

    // Verify payment collection is not captured in DB
    const pcDb = await medusaHelpers.getDbPaymentCollectionByOrderId(orderId);
    expect(pcDb.status).not.toBe('completed');
    expect(Number(pcDb.captured_amount)).toBe(0);
  });

  test('Cancelled Payment Scenario - Should verify checkout is not paid and is retryable', async () => {
    const cart = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cart.id, variantId, 1);
    await medusaHelpers.setShippingAddress(cart.id);
    await medusaHelpers.applyShipping(cart.id);
    
    const { session } = await medusaHelpers.createPaymentSession(cart.id, 'pp_ngenius_ngenius');
    const orderReference = session.data.reference || session.data.id;
    
    const result = await medusaHelpers.completeCart(cart.id);
    const orderId = result.order.id;

    // Simulate cancellation event
    const payload = mockWebhookPayloads.paymentCancelled(orderReference, Number(result.order.total));
    const webhookRes = await axios.post(env.ngenius.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        [env.ngenius.webhookSecretKey]: env.ngenius.webhookSecretValue,
      },
    });
    expect(webhookRes.status).toBe(200);

    // Verify order remains unpaid but still active/pending
    const orderDb = await medusaHelpers.getDbOrder(orderId);
    expect(orderDb.status).toBe('pending');
    
    const pcDb = await medusaHelpers.getDbPaymentCollectionByOrderId(orderId);
    expect(pcDb.status).not.toBe('completed');
    expect(Number(pcDb.captured_amount)).toBe(0);
  });
});
