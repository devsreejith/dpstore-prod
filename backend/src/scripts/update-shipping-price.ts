import { ExecArgs } from "@medusajs/framework/types"
import pg from "pg"

export default async function updateShippingPrice({ container }: ExecArgs) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  })
  await client.connect()
  try {
    // 1. Find the price row for the shipping option price set
    const priceSetId = 'pset_01KSR67FR1SY1ZED46PTSYKFTQ'
    const priceRes = await client.query(`
      SELECT * FROM price WHERE price_set_id = $1
    `, [priceSetId])
    console.log("Current prices for shipping option:", priceRes.rows)

    if (priceRes.rows.length > 0) {
      for (const row of priceRes.rows) {
        console.log(`Updating price row ${row.id}...`)
        await client.query(`
          UPDATE price 
          SET amount = 25, 
              raw_amount = '{"value": "25", "precision": 20}'::jsonb,
              updated_at = NOW() 
          WHERE id = $1
        `, [row.id])
      }
      console.log("Prices updated successfully in DB!")
    } else {
      console.log("No price row found. Inserting a new one...")
      await client.query(`
        INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, rules_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        'price_shipping_standard_ae',
        priceSetId,
        'aed',
        25,
        JSON.stringify({ value: '25', precision: 20 }),
        0
      ])
      console.log("Inserted new price row!")
    }

    // Verify
    const verifyRes = await client.query(`
      SELECT * FROM price WHERE price_set_id = $1
    `, [priceSetId])
    console.log("Updated prices in DB:", verifyRes.rows)
  } finally {
    await client.end()
  }
}
