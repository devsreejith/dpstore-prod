import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  deleteProductsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import crypto from "crypto"
import fs from "fs"
import path from "path"

function resolveBackendProjectRoot() {
  const cwd = process.cwd()
  const candidates = [
    cwd,
    path.join(cwd, "backend"),
    path.join(cwd, "apps", "backend"),
    path.join(cwd, "backend", "apps", "backend"),
  ]

  for (const candidate of candidates) {
    try {
      const pkgPath = path.join(candidate, "package.json")
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
        if (pkg?.name === "@dtc/backend") return candidate
      }
    } catch {}
  }

  return cwd
}

function getUploadDirAbsolute() {
  const uploadDir = process.env.UPLOAD_DIR || "public/uploads"
  const projectRoot = resolveBackendProjectRoot()
  return path.isAbsolute(uploadDir) ? uploadDir : path.join(projectRoot, uploadDir)
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function writeSampleProductImage(uploadDirAbs: string) {
  ensureDir(uploadDirAbs)
  const filename = `sample-product-${crypto.randomUUID()}.png`
  const abs = path.join(uploadDirAbs, filename)

  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFgwJ/lK8l1gAAAABJRU5ErkJggg=="
  const buf = Buffer.from(pngBase64, "base64")
  fs.writeFileSync(abs, buf)

  return `/uploads/${filename}`
}

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const countries = ["ae"]
  const currencyCode = (process.env.DEFAULT_CURRENCY_CODE || "aed").toLowerCase()

  const defaultSalesChannelName = "Default Sales Channel"
  const defaultPublishableKeyTitle = "Default Publishable API Key"
  const defaultStoreName = "Dubai Police Store"
  const defaultRegionName = "UAE"
  const defaultStockLocationName = "Main Warehouse"

  logger.info("Skipping product reset step to preserve existing catalog items and active reservations.")


  logger.info("Ensuring sales channel...")
  const { data: existingSalesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: defaultSalesChannelName },
    pagination: { skip: 0, take: 1 },
  })
  let defaultSalesChannel = existingSalesChannels?.[0]
  if (!defaultSalesChannel) {
    const {
      result: [created],
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: defaultSalesChannelName,
            description: "Created by Medusa",
          },
        ],
      },
    })
    defaultSalesChannel = created
  }

  logger.info("Ensuring publishable API key...")
  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "type"],
    filters: { title: defaultPublishableKeyTitle, type: "publishable" },
    pagination: { skip: 0, take: 1 },
  })
  let publishableApiKey = existingKeys?.[0]
  if (!publishableApiKey) {
    const {
      result: [createdKey],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: defaultPublishableKeyTitle,
            type: "publishable",
            created_by: "",
          },
        ],
      },
    })
    publishableApiKey = createdKey
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [defaultSalesChannel.id] },
  })

  logger.info("Ensuring store...")
  const { data: existingStores } = await query.graph({
    entity: "store",
    fields: ["id", "name"],
    filters: { name: defaultStoreName },
    pagination: { skip: 0, take: 1 },
  })
  if (!existingStores?.[0]) {
    await createStoresWorkflow(container).run({
      input: {
        stores: [
          {
            name: defaultStoreName,
            supported_currencies: [{ currency_code: currencyCode, is_default: true }],
            default_sales_channel_id: defaultSalesChannel.id,
          },
        ],
      },
    })
  }

  logger.info("Ensuring region...")
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name"],
    filters: { name: defaultRegionName },
    pagination: { skip: 0, take: 1 },
  })
  if (!existingRegions?.[0]) {
    try {
      await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: defaultRegionName,
              currency_code: currencyCode,
              countries,
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      })
    } catch (e: any) {
      const msg = String(e?.message ?? "")
      if (!msg.includes("already assigned to a region")) throw e
    }
  }

  logger.info("Seeding tax regions...")
  try {
    await createTaxRegionsWorkflow(container).run({
      input: countries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    })
  } catch (e: any) {
    const msg = String(e?.message ?? "")
    if (!msg.toLowerCase().includes("already")) throw e
  }

  logger.info("Seeding 5% VAT rate...")
  try {
    const pg = await import("pg")
    const client = new pg.default.Client({
      connectionString: process.env.DATABASE_URL,
    })
    await client.connect()
    try {
      const taxRegions = await client.query("SELECT id, country_code FROM tax_region")
      for (const region of taxRegions.rows) {
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
    } finally {
      await client.end()
    }
  } catch (err: any) {
    logger.error("Failed to seed tax rates: " + err.message)
  }

  logger.info("Seeding stock location data...")
  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    filters: { name: defaultStockLocationName },
    pagination: { skip: 0, take: 1 },
  })
  let stockLocation = existingLocations?.[0]
  if (!stockLocation) {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: defaultStockLocationName,
            address: {
              city: "Dubai",
              country_code: "AE",
              address_1: "",
            },
          },
        ],
      },
    })
    stockLocation = stockLocationResult[0]
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [defaultSalesChannel.id] },
  })

  logger.info("Skipping product catalog and inventory level seeding (preserving existing database products).")
  logger.info("Initial data seed completed.")
}
