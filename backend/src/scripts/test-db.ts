import { ExecArgs } from "@medusajs/framework/types"
import pg from "pg"

export default async function testDb({ container }: ExecArgs) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  })
  await client.connect()
  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'payment'
    `)
    console.log("Columns of payment table:", res.rows.map((r: any) => `${r.column_name} (${r.data_type})`))

    const sample = await client.query(`
      SELECT * FROM payment LIMIT 3
    `)
    console.log("Samples of payment table:", sample.rows)
  } finally {
    await client.end()
  }
}
