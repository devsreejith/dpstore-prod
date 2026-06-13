import { medusaHelpers, storeApi } from '../helpers/medusa-client';
import axios from 'axios';
import { env } from '../config/env';
import { mockWebhookPayloads } from '../test-data/payloads';

describe('Medusa.js v2 Inventory & Concurrency Tests', () => {
  let variantId: string;

  beforeAll(async () => {
    const variantInfo = await medusaHelpers.getTestProductVariantId();
    variantId = variantInfo.variantId;
  });

  test('Inventory Reduction - Stock must decrease after successful payment', async () => {
    // 1. Get initial inventory
    const initialStock = await medusaHelpers.getDbInventory(variantId);
    
    // Ensure we have stock to perform test
    if (initialStock < 5) {
      await medusaHelpers.setDbInventory(variantId, 10);
    }
    const stockBefore = await medusaHelpers.getDbInventory(variantId);

    // 2. Setup cart and checkout
    const cart = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cart.id, variantId, 2);
    await medusaHelpers.setShippingAddress(cart.id);
    await medusaHelpers.applyShipping(cart.id);
    
    const { session } = await medusaHelpers.createPaymentSession(cart.id, 'pp_ngenius_ngenius');
    const orderReference = session.data.reference || session.data.id;
    const result = await medusaHelpers.completeCart(cart.id);

    // 3. Send successful payment webhook
    const payload = mockWebhookPayloads.paymentCaptured(orderReference, Number(result.order.total));
    await axios.post(env.ngenius.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        [env.ngenius.webhookSecretKey]: env.ngenius.webhookSecretValue,
      },
    });

    // 4. Verify stock decreased by 2
    const stockAfter = await medusaHelpers.getDbInventory(variantId);
    expect(stockAfter).toBe(stockBefore - 2);
  });

  test('Stock Unchanged on Failure - Failed payment does not reduce stock', async () => {
    const stockBefore = await medusaHelpers.getDbInventory(variantId);

    const cart = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cart.id, variantId, 1);
    await medusaHelpers.setShippingAddress(cart.id);
    await medusaHelpers.applyShipping(cart.id);
    
    const { session } = await medusaHelpers.createPaymentSession(cart.id, 'pp_ngenius_ngenius');
    const orderReference = session.data.reference || session.data.id;
    const result = await medusaHelpers.completeCart(cart.id);

    // Send failed payment webhook
    const payload = mockWebhookPayloads.paymentFailed(orderReference, Number(result.order.total));
    await axios.post(env.ngenius.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        [env.ngenius.webhookSecretKey]: env.ngenius.webhookSecretValue,
      },
    });

    // Verify stock remains the same
    const stockAfter = await medusaHelpers.getDbInventory(variantId);
    expect(stockAfter).toBe(stockBefore);
  });

  test('Concurrency Check - Simultaneous checkouts on stock=1 must prevent overselling', async () => {
    // 1. Force stock level to 1
    await medusaHelpers.setDbInventory(variantId, 1);

    // 2. Setup Cart A
    const cartA = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cartA.id, variantId, 1);
    await medusaHelpers.setShippingAddress(cartA.id);
    await medusaHelpers.applyShipping(cartA.id);
    await medusaHelpers.createPaymentSession(cartA.id, 'pp_ngenius_ngenius');

    // 3. Setup Cart B
    const cartB = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cartB.id, variantId, 1);
    await medusaHelpers.setShippingAddress(cartB.id);
    await medusaHelpers.applyShipping(cartB.id);
    await medusaHelpers.createPaymentSession(cartB.id, 'pp_ngenius_ngenius');

    // 4. Trigger parallel completes
    const completePromises = [
      medusaHelpers.completeCart(cartA.id).catch(err => ({ error: true, message: err.message })),
      medusaHelpers.completeCart(cartB.id).catch(err => ({ error: true, message: err.message }))
    ];

    const results = await Promise.all(completePromises);
    
    // Assert that only one request was successful and the other failed/rejected due to out of stock
    const successes = results.filter(r => r && !r.error && r.type === 'order');
    const failures = results.filter(r => r && (r.error || r.type !== 'order'));

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    // Verify inventory is exactly 0 (no negative stocked quantity/overselling)
    const stockAfter = await medusaHelpers.getDbInventory(variantId);
    expect(stockAfter).toBe(0);
  });

  test('Double-Click Place Order Simulation - Multiple duplicate completions must fail gracefully', async () => {
    const cart = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cart.id, variantId, 1);
    await medusaHelpers.setShippingAddress(cart.id);
    await medusaHelpers.applyShipping(cart.id);
    await medusaHelpers.createPaymentSession(cart.id, 'pp_ngenius_ngenius');

    // Trigger completeCart multiple times concurrently
    const calls = [
      medusaHelpers.completeCart(cart.id).catch(e => ({ error: true, message: e.message })),
      medusaHelpers.completeCart(cart.id).catch(e => ({ error: true, message: e.message })),
      medusaHelpers.completeCart(cart.id).catch(e => ({ error: true, message: e.message }))
    ];

    const results = await Promise.all(calls);
    const successes = results.filter(r => r && !r.error && r.type === 'order');
    
    // Only one order should be created successfully, the rest fail or return already completed state
    expect(successes.length).toBe(1);
  });

  test('Scenario A - Adding products to cart by multiple users must NOT reduce stock or create reservations', async () => {
    // 1. Reset stock to 10
    await medusaHelpers.setDbInventory(variantId, 10);
    const initialStock = await medusaHelpers.getDbInventory(variantId);
    expect(initialStock).toBe(10);

    // 2. Simulate User A, B, C, D, E adding 5 to cart
    const cartA = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cartA.id, variantId, 5);

    const cartB = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cartB.id, variantId, 5);

    const cartC = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cartC.id, variantId, 5);

    const cartD = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cartD.id, variantId, 5);

    const cartE = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cartE.id, variantId, 5);

    // 3. Verify stock is unchanged and available stock remains 10 (no reservations are created)
    const availableStock = await medusaHelpers.getDbInventory(variantId);
    expect(availableStock).toBe(10);
  });

  test('Expected Lifecycle Stages - Verifying stock at cart creation, checkout start, and completion', async () => {
    // 1. Initial State: stock = 10
    await medusaHelpers.setDbInventory(variantId, 10);
    const stockStage1 = await medusaHelpers.getDbInventory(variantId);
    expect(stockStage1).toBe(10);

    // 2. Customer adds 2 to cart: stock must remain 10
    const cart = await medusaHelpers.createCart();
    await medusaHelpers.addToCart(cart.id, variantId, 2);
    const stockStage2 = await medusaHelpers.getDbInventory(variantId);
    expect(stockStage2).toBe(10);

    // 3. Customer starts checkout (shipping & payment session setup): stock must remain 10
    await medusaHelpers.setShippingAddress(cart.id);
    await medusaHelpers.applyShipping(cart.id);
    await medusaHelpers.createPaymentSession(cart.id, 'pp_ngenius_ngenius');
    const stockStage3 = await medusaHelpers.getDbInventory(variantId);
    expect(stockStage3).toBe(10);

    // 4. Order completed (cart completed): reservation created, available stock becomes 8
    await medusaHelpers.completeCart(cart.id);
    const stockStage4 = await medusaHelpers.getDbInventory(variantId);
    expect(stockStage4).toBe(8);
  });
});
