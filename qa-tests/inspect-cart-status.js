const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const cartId = 'cart_01KV3S7QYM3YHKHC11P5VYA6PZ';
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log(`=== Inspecting DB status for Cart ID: ${cartId} ===`);

    // 1. Check if the cart exists
    const cartRes = await client.query('SELECT * FROM cart WHERE id = $1', [cartId]);
    if (cartRes.rows.length === 0) {
      console.log('Cart does not exist.');
    } else {
      console.log('Cart Details:', {
        id: cartRes.rows[0].id,
        email: cartRes.rows[0].email,
        created_at: cartRes.rows[0].created_at,
      });
    }

    // 2. Check order_cart mapping
    const orderCartRes = await client.query('SELECT * FROM order_cart WHERE cart_id = $1', [cartId]);
    console.log('\nOrder-Cart mapping entries:', orderCartRes.rows);

    if (orderCartRes.rows.length > 0) {
      const orderId = orderCartRes.rows[0].order_id;
      // Fetch Order Details
      const orderRes = await client.query('SELECT id, display_id, status, payment_status, created_at, canceled_at FROM "order" WHERE id = $1', [orderId]);
      console.log('Order Details:', orderRes.rows);

      // Fetch Order-Payment Collections
      const opcRes = await client.query('SELECT * FROM order_payment_collection WHERE order_id = $1', [orderId]);
      console.log('Order-Payment Collection mappings:', opcRes.rows);
    }

    // 3. Fetch Payment Collections linked to cart or order
    const pcRes = await client.query(`
      SELECT pc.id, pc.status, pc.amount, pc.authorized_amount, pc.captured_amount, pc.created_at
      FROM payment_collection pc
      WHERE pc.id IN (
        SELECT payment_collection_id FROM cart_payment_collection WHERE cart_id = $1
      )
    `, [cartId]);
    console.log('\nPayment Collections linked to cart:', pcRes.rows);

    if (pcRes.rows.length > 0) {
      const pcIds = pcRes.rows.map(r => r.id);
      
      // Fetch Payment Sessions
      const psRes = await client.query(`
        SELECT id, payment_collection_id, provider_id, status, data, created_at, updated_at
        FROM payment_session
        WHERE payment_collection_id = ANY($1)
      `, [pcIds]);
      console.log('\nPayment Sessions:', psRes.rows.map(s => ({
        id: s.id,
        payment_collection_id: s.payment_collection_id,
        provider_id: s.provider_id,
        status: s.status,
        data: s.data,
        created_at: s.created_at,
        updated_at: s.updated_at
      })));

      // Fetch Payments
      const payRes = await client.query(`
        SELECT id, payment_collection_id, amount, authorized_amount, captured_amount, captured_at, created_at
        FROM payment
        WHERE payment_collection_id = ANY($1)
      `, [pcIds]);
      console.log('\nPayments:', payRes.rows);
    }

  } catch (error) {
    console.error('Error during inspection:', error);
  } finally {
    await client.end();
  }
}

main();
