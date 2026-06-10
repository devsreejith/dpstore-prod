import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import { z } from "zod"
import { mapMedusaProductToFrontend } from "../../_shared/frontend"

const CreateProductSchema = z.object({
  name: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(10_000).optional(),
  price: z.number().min(0),
  sale_price: z.number().min(0).optional(),
  sku: z.string().trim().max(255).optional(),
  item_code: z.string().trim().max(255).optional(),
  collection_id: z.string().trim().min(1).optional(),
  images: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).optional(),
  category_slugs: z.array(z.string().trim().min(1).max(255)).optional(),
  featured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  trending: z.boolean().optional(),
  seo: z
    .object({
      title: z.string().trim().max(255).optional(),
      description: z.string().trim().max(500).optional(),
      keywords: z.array(z.string().trim().min(1).max(50)).optional(),
    })
    .optional(),
})

async function resolveShippingProfileId(query: any) {
  const { data } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    pagination: { skip: 0, take: 1 },
  })
  return data?.[0]?.id
}

async function resolveSalesChannelId(query: any) {
  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    pagination: { skip: 0, take: 1 },
  })
  return data?.[0]?.id
}

async function resolveStockLocationId(query: any) {
  const { data } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
    pagination: { skip: 0, take: 1 },
  })
  return data?.[0]?.id
}

async function resolveCategoryIdsByHandles(query: any, handles: string[]) {
  if (!handles.length) return []
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    filters: { handle: handles },
    pagination: { skip: 0, take: 200 },
  })
  const byHandle = new Map((data ?? []).map((c: any) => [c.handle, c.id]))
  return handles
    .map((h) => byHandle.get(h))
    .filter((id: any): id is string => typeof id === "string" && id.trim().length > 0)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "description",
      "thumbnail",
      "metadata",
      "created_at",
      "updated_at",
      "images.*",
      "variants.*",
      "variants.prices.*",
      "tags.*",
      "categories.*",
      "options.*",
      "options.values.*",
    ],
    pagination: { skip: 0, take: 200 },
  })

  res.json({
    data: (products ?? []).map((p: any) => ({
      medusa: p,
      frontend: mapMedusaProductToFrontend(p),
    })),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const parsed = CreateProductSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() })
      return
    }

    const currency = (process.env.DEFAULT_CURRENCY_CODE || "aed").toLowerCase()
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const shipping_profile_id = await resolveShippingProfileId(query)
    if (!shipping_profile_id) {
      res.status(400).json({
        message: "No shipping profile found. Run the backend seed/migrations first.",
      })
      return
    }

    const sales_channel_id = await resolveSalesChannelId(query)
    if (!sales_channel_id) {
      res.status(400).json({
        message: "No sales channel found. Run the backend seed/migrations first.",
      })
      return
    }

    const category_handles = (parsed.data.category_slugs ?? []).slice(0, 1)
    const category_ids = await resolveCategoryIdsByHandles(query, category_handles)

    const handle =
      parsed.data.slug ??
      parsed.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")

    const images = (parsed.data.images ?? []).map((url) => ({ url }))
    const sku = (parsed.data.item_code || parsed.data.sku || "").trim()
    const collection_id = (parsed.data.collection_id || "").trim()

    const { createProductsWorkflow } = await import("@medusajs/medusa/core-flows")
    const { result } = await createProductsWorkflow(req.scope).run({
      input: {
        products: [
          {
            title: parsed.data.name,
            handle,
            description: parsed.data.description,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id,
            sales_channels: [{ id: sales_channel_id }],
            ...(collection_id ? { collection_id } : {}),
            ...(category_ids.length ? { category_ids } : {}),
            ...(images.length ? { images } : {}),
            options: [{ title: "Default", values: ["Default"] }],
            variants: [
              {
                title: "Default",
                ...(sku ? { sku } : {}),
                options: { Default: "Default" },
                prices: [{ amount: parsed.data.price, currency_code: currency }],
                manage_inventory: true,
              },
            ],
            metadata: {
              price: parsed.data.price,
              retail_price: parsed.data.price,
              ...(sku ? { item_code: sku } : {}),
              ...(parsed.data.sale_price !== undefined
                ? { sale_price: parsed.data.sale_price }
                : {}),
              ...(parsed.data.tags?.length ? { tags: parsed.data.tags } : {}),
              ...(parsed.data.featured !== undefined ? { featured: parsed.data.featured } : {}),
              ...(parsed.data.isNewArrival !== undefined
                ? { isNewArrival: parsed.data.isNewArrival }
                : {}),
              ...(parsed.data.trending !== undefined ? { trending: parsed.data.trending } : {}),
              ...(parsed.data.seo ? { seo: parsed.data.seo } : {}),
            },
          },
        ],
      },
    })

    const createdId = result?.[0]?.id ?? result?.[0]
    const createdIdStr = typeof createdId === "string" ? createdId : ""

    let created: any = result?.[0]
    if (createdIdStr) {
      const { data } = await query.graph({
        entity: "product",
        fields: [
          "id",
          "title",
          "handle",
          "description",
          "thumbnail",
          "metadata",
          "created_at",
          "updated_at",
          "images.*",
          "variants.*",
          "variants.prices.*",
          "variants.inventory_items.inventory_item_id",
          "tags.*",
          "categories.*",
          "options.*",
          "options.values.*",
        ],
        filters: { id: createdIdStr },
      })
      created = data?.[0] ?? created
    }

    const variant = created?.variants?.[0]
    if (variant) {
      const stockLocationId = await resolveStockLocationId(query)
      const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id
      if (stockLocationId && inventoryItemId) {
        const { createInventoryLevelsWorkflow } = await import("@medusajs/medusa/core-flows")
        await createInventoryLevelsWorkflow(req.scope).run({
          input: {
            inventory_levels: [
              {
                location_id: stockLocationId,
                stocked_quantity: 1000, // Seed initial quantity
                inventory_item_id: inventoryItemId,
              },
            ],
          },
        })
      }
    }


    res.status(201).json({
      medusa: created,
      frontend: created ? mapMedusaProductToFrontend(created) : null,
    })
  } catch (e: any) {
    if ((res as any).headersSent) return
    res.status(500).json({
      message: String(e?.message ?? "Failed to create product"),
      ...(process.env.NODE_ENV !== "production"
        ? { details: e?.details ?? e?.cause ?? e?.errors ?? null, stack: e?.stack ?? null }
        : {}),
    })
  }
}
