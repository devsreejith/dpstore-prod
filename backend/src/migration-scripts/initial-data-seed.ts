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

  logger.info("Resetting products (keeping categories)...")
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
    pagination: { skip: 0, take: 2000 },
  })
  const productIds = (existingProducts ?? []).map((p: any) => p.id).filter(Boolean)
  if (productIds.length) {
    await deleteProductsWorkflow(container).run({ input: { ids: productIds } })
  }

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

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    pagination: { skip: 0, take: 1 },
  })
  const shippingProfileId = shippingProfiles?.[0]?.id

  logger.info("Creating sample category + sample product...")
  const uploadUrl = writeSampleProductImage(getUploadDirAbsolute())

  const sampleCategoryHandle = "sample-category"
  const { data: existingCategory } = await query.graph({
    entity: "product_category",
    fields: ["id"],
    filters: { handle: sampleCategoryHandle },
    pagination: { skip: 0, take: 1 },
  })

  let defaultCategoryId = existingCategory?.[0]?.id as string | undefined
  if (!defaultCategoryId) {
    const { result: categoryResult } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          {
            name: "Sample Category",
            handle: sampleCategoryHandle,
            description: "Sample category created by seed script.",
            is_active: true,
          },
        ],
      },
    })
    defaultCategoryId = categoryResult?.[0]?.id
  }

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Dubai Police Sample Product",
          handle: "dubai-police-sample-product",
          description: "This is a single sample product served dynamically from Medusa.",
          status: ProductStatus.PUBLISHED,
          thumbnail: uploadUrl,
          ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
          ...(defaultCategoryId ? { category_ids: [defaultCategoryId] } : {}),
          images: [{ url: uploadUrl }],
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              sku: "DP-SAMPLE-001",
              options: { Default: "Default" },
              prices: [{ amount: 100, currency_code: currencyCode }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
          metadata: {
            featured: true,
            isNewArrival: true,
          },
        },
      ],
    },
  })

  logger.info("Seeding inventory levels...")
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: (inventoryItems ?? []).map((item: any) => ({
        location_id: stockLocation.id,
        stocked_quantity: 1000000,
        inventory_item_id: item.id,
      })),
    },
  })

  logger.info("Initial data seed completed.")
}
