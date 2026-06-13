const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://medusa:medusa@localhost:5433/dp_store'
  });

  try {
    await client.connect();
    const res = await client.query('SELECT id, status, amount, authorized_amount, captured_amount FROM payment_collection LIMIT 10');
    console.log("Payment Collections:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
