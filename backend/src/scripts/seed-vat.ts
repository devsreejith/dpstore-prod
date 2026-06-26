import { ExecArgs } from "@medusajs/framework/types"
import { createTaxRegionsWorkflow } from "@medusajs/medusa/core-flows"
import pg from "pg"

export default async function seedVat({ container }: ExecArgs) {
  const logger = container.resolve("logger") || console
  const countries = ["ae"]

  logger.info("Seeding tax regions...")
  try {
    await createTaxRegionsWorkflow(container).run({
      input: countries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    })
    logger.info("Tax region 'ae' ensured.")
  } catch (e: any) {
    const msg = String(e?.message ?? "")
    if (!msg.toLowerCase().includes("already")) {
      logger.error("Failed to create tax region: " + e.message)
    } else {
      logger.info("Tax region 'ae' already exists.")
    }
  }

  logger.info("Seeding 5% VAT rate...")
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  })
  await client.connect()
  try {
    const taxRegions = await client.query("SELECT id, country_code FROM tax_region")
    for (const region of taxRegions.rows) {
      if (region.country_code !== "ae") continue;

      const existing = await client.query(
        "SELECT id FROM tax_rate WHERE tax_region_id = $1 AND is_default = true AND deleted_at IS NULL",
        [region.id]
      )
      if (existing.rows.length === 0) {
        const id = "txrt_" + Math.random().toString(36).substring(2, 15)
        logger.info(`Inserting 5% VAT rate for region ${region.country_code} (${region.id}) with id ${id}...`)
        await client.query(
          `INSERT INTO tax_rate (id, rate, code, name, is_default, is_combinable, tax_region_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [id, 5.0, "VAT", "VAT 5%", true, false, region.id]
        )
      } else {
        logger.info(`Default tax rate already exists for region ${region.country_code} (${region.id}), updating rate to 5%...`)
        await client.query(
          "UPDATE tax_rate SET rate = $1, code = $2, name = $3, updated_at = NOW() WHERE tax_region_id = $4 AND is_default = true AND deleted_at IS NULL",
          [5.0, "VAT", "VAT 5%", region.id]
        )
      }
    }
    logger.info("VAT rate seeding completed successfully!")
  } catch (err: any) {
    logger.error("Failed to seed tax rates: " + err.message)
  } finally {
    await client.end()
  }
}
