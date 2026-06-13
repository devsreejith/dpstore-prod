import { medusaHelpers } from '../helpers/medusa-client';

describe('Medusa.js v2 E-Commerce Smoke Tests', () => {
  let cartId: string;
  let variantId: string;
  let lineItemId: string;

  beforeAll(async () => {
    // Retrieve a product variant ID for checkout
    const variantInfo = await medusaHelpers.getTestProductVariantId();
    variantId = variantInfo.variantId;
  });

  test('Should create a new cart successfully', async () => {
    const cart = await medusaHelpers.createCart();
    expect(cart).toBeDefined();
    expect(cart.id).toBeDefined();
    expect(cart.id).toMatch(/^cart_/);
    cartId = cart.id;
  });

  test('Should add product variant to the cart', async () => {
    const cart = await medusaHelpers.addToCart(cartId, variantId, 1);
    expect(cart.items).toBeDefined();
    expect(cart.items.length).toBeGreaterThan(0);
    lineItemId = cart.items[0].id;
    expect(cart.items[0].variant_id).toBe(variantId);
  });

  test('Should update cart item quantity', async () => {
    const cart = await medusaHelpers.updateCartItem(cartId, lineItemId, 3);
    expect(cart.items[0].quantity).toBe(3);
  });

  test('Should set shipping address and options', async () => {
    let cart = await medusaHelpers.setShippingAddress(cartId);
    expect(cart.shipping_address).toBeDefined();
    expect(cart.shipping_address.city).toBe('Dubai');
    
    cart = await medusaHelpers.applyShipping(cartId);
    expect(cart.shipping_methods).toBeDefined();
    expect(cart.shipping_methods.length).toBeGreaterThan(0);
  });

  test('Should initialize N-Genius payment session and verify session creation', async () => {
    const { paymentCollection, session } = await medusaHelpers.createPaymentSession(cartId, 'pp_ngenius_ngenius');
    expect(paymentCollection).toBeDefined();
    expect(session).toBeDefined();
    expect(session.provider_id).toBe('pp_ngenius_ngenius');
    expect(session.status).toBe('pending');
    expect(session.data?.payment_url).toBeDefined();
  });

  test('Should complete the cart and verify order creation flow', async () => {
    const result = await medusaHelpers.completeCart(cartId);
    expect(result).toBeDefined();
    expect(result.type).toBe('order');
    expect(result.order).toBeDefined();
    expect(result.order.id).toMatch(/^order_/);
  });
});
