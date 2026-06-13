const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Error: DATABASE_URL is not set in your .env file.");
    process.exit(1);
  }

  console.log("Connecting to database to retrieve UAT configuration...");
  const client = new Client({ connectionString });
  
  try {
    await client.connect();

    // 1. Fetch Publishable Keys
    const apiKeysRes = await client.query("SELECT token, title FROM api_key WHERE type = 'publishable'");
    console.log("\n--- Publishable API Keys found ---");
    apiKeysRes.rows.forEach(row => {
      console.log(`Key Token: ${row.token} (${row.title})`);
    });

    // 2. Fetch Regions
    const regionsRes = await client.query("SELECT id, name FROM region");
    console.log("\n--- Regions found ---");
    regionsRes.rows.forEach(row => {
      console.log(`Region ID: ${row.id} (${row.name})`);
    });

    // 3. Fetch Sales Channels
    const channelsRes = await client.query("SELECT id, name FROM sales_channel");
    console.log("\n--- Sales Channels found ---");
    channelsRes.rows.forEach(row => {
      console.log(`Sales Channel ID: ${row.id} (${row.name})`);
    });

    // 4. Fetch Last 5 Payment Collections to diagnose UAT statuses
    try {
      const pcRes = await client.query(`
        SELECT pc.id, pc.status, pc.amount, pc.authorized_amount, pc.captured_amount, ps.provider_id 
        FROM payment_collection pc
        LEFT JOIN payment_session ps ON ps.payment_collection_id = pc.id
        ORDER BY pc.created_at DESC LIMIT 5
      `);
      console.log("\n--- Last 5 Payment Collections ---");
      pcRes.rows.forEach(row => {
        console.log(`ID: ${row.id} | Status: ${row.status} | Provider: ${row.provider_id} | Amt: ${row.amount} | Auth: ${row.authorized_amount} | Cap: ${row.captured_amount}`);
      });
    } catch (pcErr) {
      console.log("\nCould not fetch payment collections:", pcErr.message);
    }

    if (apiKeysRes.rows.length && regionsRes.rows.length) {
      console.log("\n==================================================");
      console.log("RECOMMENDED CONFIGURATION FOR YOUR qa-tests/.env FILE:");
      console.log("==================================================");
      console.log(`MEDUSA_PUBLISHABLE_KEY=${apiKeysRes.rows[0].token}`);
      console.log(`MEDUSA_REGION_ID=${regionsRes.rows[0].id}`);
      if (channelsRes.rows.length) {
        console.log(`MEDUSA_SALES_CHANNEL_ID=${channelsRes.rows[0].id}`);
      }
      console.log("==================================================");
    } else {
      console.log("\nWarning: No publishable keys or regions found in database.");
    }

  } catch (err) {
    console.error("Database connection or query failed:", err.message);
  } finally {
    await client.end();
  }
}

main();
