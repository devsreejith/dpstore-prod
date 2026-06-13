import axios from 'axios';
import { Client } from 'pg';
import { env } from '../config/env';

// Configure axios instance for Store API
export const storeApi = axios.create({
  baseURL: env.medusa.baseUrl,
  headers: {
    'Content-Type': 'application/json',
    'x-publishable-api-key': env.medusa.publishableKey,
  },
});

// Configure database client helper
export async function getDbClient() {
  const client = new Client({
    connectionString: env.db.connectionString,
  });
  await client.connect();
  return client;
}

// Reusable Helper Functions for QA Testing
export const medusaHelpers = {
  /**
   * Helper to retrieve a product variant ID for testing
   */
  async getTestProductVariantId(): Promise<{ variantId: string; productId: string }> {
    const res = await storeApi.get('/store/products');
    const products = res.data.products || [];
    if (!products.length) {
      throw new Error("No products found in Medusa store.");
    }
    const product = products.find((p: any) => p.variants && p.variants.length) || products[0];
    const variant = product.variants?.[0];
    if (!variant) {
      throw new Error(`Product ${product.id} does not have any variants.`);
    }
    return {
      variantId: variant.id,
      productId: product.id,
    };
  },

  /**
   * Helper to fetch available inventory quantity (stocked - reserved) directly from the DB
   */
  async getDbInventory(variantId: string): Promise<number> {
    const db = await getDbClient();
    try {
      // Query Medusa v2 inventory levels
      const res = await db.query(
        `SELECT stocked_quantity, reserved_quantity FROM inventory_level WHERE inventory_item_id = (
           SELECT inventory_item_id FROM product_variant_inventory_item WHERE variant_id = $1
         ) LIMIT 1`,
        [variantId]
      );
      if (res.rows.length === 0) return 0;
      const stocked = Number(res.rows[0].stocked_quantity);
      const reserved = Number(res.rows[0].reserved_quantity || 0);
      return stocked - reserved;
    } finally {
      await db.end();
    }
  },

  /**
   * Helper to set inventory quantity directly in the DB and enable strict inventory management
   */
  async setDbInventory(variantId: string, quantity: number): Promise<void> {
    await storeApi.post('/store/custom', {
      action: 'reset-inventory',
      variant_id: variantId,
      quantity,
    });
  },

  /**
   * Create an active cart
   */
  async createCart(regionId?: string): Promise<any> {
    const rId = regionId || env.medusa.regionId;
    const body: any = {};
    if (rId) body.region_id = rId;
    if (env.medusa.salesChannelId) body.sales_channel_id = env.medusa.salesChannelId;

    const res = await storeApi.post('/store/carts', body);
    return res.data.cart;
  },

  /**
   * Add a product to the cart
   */
  async addToCart(cartId: string, variantId: string, quantity = 1): Promise<any> {
    const res = await storeApi.post(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      quantity,
    });
    return res.data.cart;
  },

  /**
   * Update quantity of an item in the cart
   */
  async updateCartItem(cartId: string, itemId: string, quantity: number): Promise<any> {
    const res = await storeApi.post(`/store/carts/${cartId}/line-items/${itemId}`, {
      quantity,
    });
    return res.data.cart;
  },

  /**
   * Set shipping and billing address
   */
  async setShippingAddress(cartId: string, email = 'test@example.com'): Promise<any> {
    const address = {
      first_name: 'QA',
      last_name: 'Tester',
      address_1: '123 Test Street',
      city: 'Dubai',
      province: 'Dubai',
      postal_code: '00000',
      country_code: 'ae',
      phone: '+971500000000',
    };
    const res = await storeApi.post(`/store/carts/${cartId}`, {
      email,
      shipping_address: address,
      billing_address: address,
    });
    return res.data.cart;
  },

  /**
   * Apply shipping method to the cart
   */
  async applyShipping(cartId: string): Promise<any> {
    // 1. Fetch available shipping options for the cart
    const resOptions = await storeApi.get('/store/shipping-options', {
      params: { cart_id: cartId },
    });
    const options = resOptions.data.shipping_options || [];
    if (!options.length) {
      throw new Error("No shipping options available for this region.");
    }
    // 2. Select first shipping option and apply it
    const res = await storeApi.post(`/store/carts/${cartId}/shipping-methods`, {
      option_id: options[0].id,
    });
    return res.data.cart;
  },

  /**
   * Create payment collection and initialize payment sessions
   */
  async createPaymentSession(cartId: string, providerId: string): Promise<any> {
    // Create payment collection
    const resColl = await storeApi.post(`/store/payment-collections`, { cart_id: cartId });
    const pc = resColl.data.payment_collection;
    
    // Add payment session
    const resSession = await storeApi.post(`/store/payment-collections/${pc.id}/payment-sessions`, {
      provider_id: providerId,
      data: {
        cart_id: cartId,
      },
    });
    return {
      paymentCollection: resSession.data.payment_collection,
      session: resSession.data.payment_collection?.payment_sessions?.[0],
    };
  },

  /**
   * Complete the cart and finalize the order creation
   */
  async completeCart(cartId: string): Promise<any> {
    const res = await storeApi.post(`/store/carts/${cartId}/complete`);
    return res.data;
  },

  /**
   * Fetch order from DB to assert values
   */
  async getDbOrder(orderId: string): Promise<any> {
    const db = await getDbClient();
    try {
      const res = await db.query('SELECT * FROM "order" WHERE id = $1', [orderId]);
      return res.rows[0] || null;
    } finally {
      await db.end();
    }
  },

  /**
   * Fetch payment collection from DB to assert values
   */
  async getDbPaymentCollectionByOrderId(orderId: string): Promise<any> {
    const db = await getDbClient();
    try {
      const res = await db.query(
        `SELECT pc.* FROM payment_collection pc 
         JOIN order_payment_collection opc ON opc.payment_collection_id = pc.id
         WHERE opc.order_id = $1 AND opc.deleted_at IS NULL`,
        [orderId]
      );
      return res.rows[0] || null;
    } finally {
      await db.end();
    }
  },
};
