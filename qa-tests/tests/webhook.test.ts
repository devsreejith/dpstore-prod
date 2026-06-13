import axios from 'axios';
import { env } from '../config/env';
import { medusaHelpers, storeApi } from '../helpers/medusa-client';
import { mockWebhookPayloads } from '../test-data/payloads';

describe('Medusa.js v2 Webhook Receiver Tests', () => {
  let variantId: string;

  beforeAll(async () => {
    const variantInfo = await medusaHelpers.getTestProductVariantId();
    variantId = variantInfo.variantId;
  });

  test('Simulate Invalid Webhook Signature - Should block with 401 Unauthorized', async () => {
    const payload = mockWebhookPayloads.paymentCaptured('mock-ref', 100);
    try {
      await axios.post(env.ngenius.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          [env.ngenius.webhookSecretKey]: 'incorrect_value_here',
        },
      });
      fail('Expected webhook request to fail with 401 but it succeeded.');
    } catch (err: any) {
      expect(err.response?.status).toBe(401);
    }
  });

  test('Simulate Duplicate Webhook Delivery - Should handle idempotently', async () => {
    // 1. Setup cart & order
    const cart = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cart.id, variantId, 1);
    await medusaHelpers.setShippingAddress(cart.id);
    await medusaHelpers.applyShipping(cart.id);
    
    const { session } = await medusaHelpers.createPaymentSession(cart.id, 'pp_ngenius_ngenius');
    const orderReference = session.data.reference || session.data.id;
    const result = await medusaHelpers.completeCart(cart.id);
    const orderId = result.order.id;

    // 2. Send webhook payload 1
    const payload = mockWebhookPayloads.paymentCaptured(orderReference, Number(result.order.total));
    const res1 = await axios.post(env.ngenius.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        [env.ngenius.webhookSecretKey]: env.ngenius.webhookSecretValue,
      },
    });
    expect(res1.status).toBe(200);

    let pcDb = await medusaHelpers.getDbPaymentCollectionByOrderId(orderId);
    expect(pcDb.status).toBe('completed');
    expect(Number(pcDb.captured_amount)).toBe(Number(result.order.total));

    // 3. Send duplicate webhook payload 2 (resend exact same reference)
    const res2 = await axios.post(env.ngenius.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        [env.ngenius.webhookSecretKey]: env.ngenius.webhookSecretValue,
      },
    });
    expect(res2.status).toBe(200);

    // Verify database remains unchanged and no duplicated captured amount or errors occurred
    pcDb = await medusaHelpers.getDbPaymentCollectionByOrderId(orderId);
    expect(pcDb.status).toBe('completed');
    expect(Number(pcDb.captured_amount)).toBe(Number(result.order.total));
  });

  test('Simulate Delayed Webhook Delivery - Should verify eventual consistency', async () => {
    const cart = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cart.id, variantId, 1);
    await medusaHelpers.setShippingAddress(cart.id);
    await medusaHelpers.applyShipping(cart.id);
    
    const { session } = await medusaHelpers.createPaymentSession(cart.id, 'pp_ngenius_ngenius');
    const orderReference = session.data.reference || session.data.id;
    const result = await medusaHelpers.completeCart(cart.id);
    const orderId = result.order.id;

    // 1. Storefront does not receive webhook immediately, checks status via direct authorization
    const verifyRes = await storeApi.post(`/store/payment-collections/${result.order.payment_collections[0].id}/authorize`);
    expect(verifyRes.status).toBe(200);

    // 2. Webhook arrives later with delay
    const payload = mockWebhookPayloads.paymentCaptured(orderReference, Number(result.order.total));
    const webhookRes = await axios.post(env.ngenius.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        [env.ngenius.webhookSecretKey]: env.ngenius.webhookSecretValue,
      },
    });
    expect(webhookRes.status).toBe(200);

    const pcDb = await medusaHelpers.getDbPaymentCollectionByOrderId(orderId);
    expect(pcDb.status).toBe('completed');
  });
});
