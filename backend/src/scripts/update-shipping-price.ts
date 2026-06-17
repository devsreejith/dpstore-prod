import { ExecArgs } from "@medusajs/framework/types"
import pg from "pg"

export default async function updateShippingPrice({ container }: ExecArgs) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  })
  await client.connect()
  try {
    // 1. Find the shipping option ID by name
    console.log("Looking up shipping option with name 'Standard UAE Shipping'...")
    const optionRes = await client.query(`
      SELECT id FROM shipping_option WHERE name = 'Standard UAE Shipping' AND deleted_at IS NULL LIMIT 1
    `)

    if (optionRes.rows.length === 0) {
      console.error("Error: Shipping option 'Standard UAE Shipping' not found in database!")
      return
    }

    const shippingOptionId = optionRes.rows[0].id
    console.log(`Found shipping option ID: ${shippingOptionId}`)

    // 2. Find the price set ID linked to this shipping option
    const linkRes = await client.query(`
      SELECT price_set_id FROM shipping_option_price_set WHERE shipping_option_id = $1 LIMIT 1
    `, [shippingOptionId])

    if (linkRes.rows.length === 0) {
      console.error(`Error: No price set linked to shipping option ID ${shippingOptionId} in shipping_option_price_set!`)
      return
    }

    const priceSetId = linkRes.rows[0].price_set_id
    console.log(`Found price set ID: ${priceSetId}`)

    // 3. Find the price row for the shipping option price set
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
      const generatedPriceId = `price_ship_${shippingOptionId.slice(-12)}`
      await client.query(`
        INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, rules_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        generatedPriceId,
        priceSetId,
        'aed',
        25,
        JSON.stringify({ value: '25', precision: 20 }),
        0
      ])
      console.log(`Inserted new price row with ID: ${generatedPriceId}`)
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
