const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://medusa:medusa@localhost:5433/dp_store'
  });

  try {
    await client.connect();
    
    // Check column type for status in payment_collection
    const resCols = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'payment_collection' AND column_name = 'status'
    `);
    console.log("Column definition:", resCols.rows);

    // If it's an enum, let's find the values
    const udtName = resCols.rows[0]?.udt_name;
    if (udtName) {
      const resEnum = await client.query(`
        SELECT enumlabel 
        FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = $1
      `, [udtName]);
      console.log("Enum values:", resEnum.rows.map(r => r.enumlabel));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
