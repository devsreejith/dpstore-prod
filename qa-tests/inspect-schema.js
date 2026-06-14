const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const orderCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'order'
    `);
    console.log("Columns of order:", orderCols.rows.map(r => `${r.column_name} (${r.data_type})`));
  } finally {
    await client.end();
  }
}

main();
