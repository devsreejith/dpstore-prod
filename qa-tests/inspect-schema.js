const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // 1. Fetch reservation items that are linked to order_line_item
    const linkedToOrder = await client.query(`
      SELECT r.id, r.line_item_id, r.quantity, r.deleted_at
      FROM reservation_item r
      JOIN order_line_item o ON r.line_item_id = o.id
    `);
    console.log(`Reservations linked to order_line_item: ${linkedToOrder.rows.length}`);
    linkedToOrder.rows.forEach(r => console.log(r));

    // 2. Fetch reservation items that are NOT linked to order_line_item
    const notLinkedToOrder = await client.query(`
      SELECT r.id, r.line_item_id, r.quantity, r.deleted_at
      FROM reservation_item r
      WHERE r.line_item_id NOT IN (SELECT id FROM order_line_item) OR r.line_item_id IS NULL
    `);
    console.log(`\nReservations NOT linked to order_line_item: ${notLinkedToOrder.rows.length}`);
    notLinkedToOrder.rows.forEach(r => console.log(r));

    // 3. See if they are linked to cart_line_item
    const linkedToCart = await client.query(`
      SELECT r.id, r.line_item_id, r.quantity, c.cart_id
      FROM reservation_item r
      JOIN cart_line_item c ON r.line_item_id = c.id
    `);
    console.log(`\nReservations linked to cart_line_item: ${linkedToCart.rows.length}`);
    linkedToCart.rows.forEach(r => console.log(r));

  } finally {
    await client.end();
  }
}

main();
