import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  batchLinksWorkflow,
  createLocationFulfillmentSetWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows"
import type { IFulfillmentModuleService } from "@medusajs/types"

export default async function ensure_shipping_setup({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillment = container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT)

  const currencyCode = (process.env.DEFAULT_CURRENCY_CODE || "aed").toLowerCase()
  const countryCode = (process.env.DEFAULT_COUNTRY_CODE || "ae").toLowerCase()
  const configuredStockLocationId = String(process.env.DEFAULT_STOCK_LOCATION_ID || "").trim()

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "default_sales_channel_id"],
    pagination: { skip: 0, take: 1 },
  })
  const store = stores?.[0]

  const configuredSalesChannelId = String(process.env.DEFAULT_SALES_CHANNEL_ID || "").trim()
  const defaultSalesChannelId = String(store?.default_sales_channel_id ?? "").trim()
  const salesChannelId = configuredSalesChannelId || defaultSalesChannelId

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    pagination: { skip: 0, take: 50 },
  })
  const stockLocationId =
    configuredStockLocationId ||
    String(locations?.find((l: any) => String(l?.name ?? "").trim() === "Main Warehouse")?.id ?? "").trim() ||
    String(locations?.[0]?.id ?? "").trim()
  if (!stockLocationId) {
    throw new Error("No stock locations found. Create a stock location first.")
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name", "type"],
    pagination: { skip: 0, take: 50 },
  })
  const shippingProfileId = String(shippingProfiles?.[0]?.id ?? "").trim()
  if (!shippingProfileId) {
    throw new Error("No shipping profiles found. Create a shipping profile first.")
  }

  const { data: fulfillmentProviders } = await query.graph({
    entity: "fulfillment_provider",
    fields: ["id", "is_enabled"],
    pagination: { skip: 0, take: 50 },
  })
  const enabledProviders = (fulfillmentProviders ?? []).filter((p: any) => p?.is_enabled !== false)
  const providerId =
    String(enabledProviders?.find((p: any) => String(p?.id ?? "").toLowerCase().includes("manual"))?.id ?? "").trim() ||
    String(enabledProviders?.[0]?.id ?? "").trim() ||
    String(fulfillmentProviders?.[0]?.id ?? "").trim()
  if (!providerId) {
    throw new Error("No fulfillment providers found. Ensure a fulfillment provider is installed/enabled.")
  }

  const { data: locationWithProviders } = await query.graph({
    entity: "stock_location",
    fields: ["id", "fulfillment_providers.id"],
    filters: { id: stockLocationId },
    pagination: { skip: 0, take: 1 },
  })
  const existingProviderIds = new Set(
    (locationWithProviders?.[0]?.fulfillment_providers ?? []).map((p: any) => String(p?.id ?? "")).filter(Boolean)
  )
  if (!existingProviderIds.has(providerId)) {
    await batchLinksWorkflow(container).run({
      input: {
        create: [
          {
            [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
            [Modules.FULFILLMENT]: { fulfillment_provider_id: providerId },
          },
        ],
        delete: [],
      },
    })
  }

  const { data: existingFulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "type"],
    filters: { name: "Shipping" },
    pagination: { skip: 0, take: 10 },
  })

  let fulfillmentSetId = String(existingFulfillmentSets?.[0]?.id ?? "").trim()
  if (!fulfillmentSetId) {
    const { result } = await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: stockLocationId,
        fulfillment_set_data: {
          name: "Shipping",
          type: "shipping",
        },
      },
    })

    const createdSetId = String((result as any)?.id ?? (result as any)?.[0]?.id ?? "").trim()
    if (createdSetId) fulfillmentSetId = createdSetId
  }

  if (!fulfillmentSetId) {
    const { data: setsFallback } = await query.graph({
      entity: "fulfillment_set",
      fields: ["id", "name", "type"],
      filters: { name: "Shipping" },
      pagination: { skip: 0, take: 1 },
    })
    fulfillmentSetId = String(setsFallback?.[0]?.id ?? "").trim()
  }

  if (!fulfillmentSetId) {
    throw new Error("Failed to create or retrieve fulfillment set.")
  }

  const { data: existingZones } = await query.graph({
    entity: "service_zone",
    fields: ["id", "name", "fulfillment_set_id"],
    filters: { fulfillment_set_id: fulfillmentSetId },
    pagination: { skip: 0, take: 50 },
  })

  let serviceZoneId = String(
    existingZones?.find((z: any) => z?.name === "UAE Shipping Zone" || z?.name === "UAE")?.id ?? ""
  ).trim()
  if (!serviceZoneId) {
    const { result } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [
          {
            name: "UAE Shipping Zone",
            fulfillment_set_id: fulfillmentSetId,
            geo_zones: [{ type: "country", country_code: countryCode }],
          },
        ],
      },
    })
    const createdZone = Array.isArray(result) ? result?.[0] : result
    serviceZoneId = String((createdZone as any)?.id ?? "").trim()
  }

  if (!serviceZoneId) {
    throw new Error("Failed to create or retrieve service zone.")
  }

  const { data: existingShippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id", "shipping_profile_id", "provider_id"],
    filters: { service_zone_id: serviceZoneId, shipping_profile_id: shippingProfileId },
    pagination: { skip: 0, take: 50 },
  })

  if (!existingShippingOptions?.length) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard UAE Shipping",
          service_zone_id: serviceZoneId,
          shipping_profile_id: shippingProfileId,
          provider_id: providerId,
          type: {
            label: "Standard",
            description: "Standard shipping",
            code: "standard",
          },
          price_type: "flat",
          prices: [{ amount: 0, currency_code: currencyCode }],
        },
      ],
    })
  }

  const nowOptions = await fulfillment.listShippingOptions({
    service_zone_id: serviceZoneId,
  } as any)

  logger.info(
    `Shipping setup ensured: location=${stockLocationId}, fulfillment_set=${fulfillmentSetId}, service_zone=${serviceZoneId}, options=${nowOptions.length}${
      salesChannelId ? `, sales_channel=${salesChannelId}` : ""
    }`
  )
}
