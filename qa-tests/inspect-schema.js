const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log("Checking tables...");
    
    // Inspect order_item table columns
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'order_item'
    `);
    console.log("Columns of order_item:", cols.rows.map(r => `${r.column_name} (${r.data_type})`));
  } finally {
    await client.end();
  }
}

main();
