import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteProductsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { z } from "zod"
import { mapMedusaProductToFrontend } from "../../../_shared/frontend"

const UpdateProductSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  slug: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(10_000).optional(),
  price: z.number().min(0).optional(),
  sale_price: z.number().min(0).optional(),
  sku: z.string().trim().max(255).optional(),
  item_code: z.string().trim().max(255).optional(),
  collection_id: z.string().trim().min(1).nullable().optional(),
  images: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).optional(),
  category_slugs: z.array(z.string().trim().min(1).max(255)).optional(),
  featured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  trending: z.boolean().optional(),
})

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

async function resolveFirstVariantId(query: any, productId: string) {
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "variants.id"],
    filters: { id: productId },
  })
  return data?.[0]?.variants?.[0]?.id
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

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
      "variants.inventory_items.inventory_item_id",
      "tags.*",
      "categories.*",
      "options.*",
      "options.values.*",
    ],
    filters: { id },
  })

  const product = products?.[0]
  if (!product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  res.json({ medusa: product, frontend: mapMedusaProductToFrontend(product) })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

  const parsed = UpdateProductSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() })
    return
  }

  const currency = (process.env.DEFAULT_CURRENCY_CODE || "aed").toLowerCase()
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const category_ids =
    parsed.data.category_slugs?.length
      ? await resolveCategoryIdsByHandles(query, parsed.data.category_slugs.slice(0, 1))
      : undefined

  const firstVariantId = await resolveFirstVariantId(query, id)
  const variantsUpdate =
    firstVariantId && (parsed.data.price !== undefined || parsed.data.sku)
      ? [
          {
            id: firstVariantId,
            ...(parsed.data.sku ? { sku: parsed.data.sku } : {}),
            ...(parsed.data.price !== undefined
              ? { prices: [{ amount: parsed.data.price, currency_code: currency }] }
              : {}),
          },
        ]
      : undefined

  const images = parsed.data.images?.map((url) => ({ url }))

  const update: Record<string, unknown> = {
    ...(parsed.data.name ? { title: parsed.data.name } : {}),
    ...(parsed.data.slug ? { handle: parsed.data.slug } : {}),
    ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    ...(category_ids?.length ? { categories: category_ids.map((id) => ({ id })) } : {}),
    ...(images?.length ? { images } : {}),
    ...(variantsUpdate?.length ? { variants: variantsUpdate } : {}),
    ...(parsed.data.collection_id !== undefined ? { collection_id: parsed.data.collection_id } : {}),
    metadata: {
      ...(parsed.data.price !== undefined ? { price: parsed.data.price } : {}),
      ...(parsed.data.price !== undefined ? { retail_price: parsed.data.price } : {}),
      ...(parsed.data.sale_price !== undefined ? { sale_price: parsed.data.sale_price } : {}),
      ...(parsed.data.tags?.length ? { tags: parsed.data.tags } : {}),
      ...(parsed.data.item_code !== undefined ? { item_code: parsed.data.item_code } : {}),
      ...(parsed.data.featured !== undefined ? { featured: parsed.data.featured } : {}),
      ...(parsed.data.isNewArrival !== undefined
        ? { isNewArrival: parsed.data.isNewArrival }
        : {}),
      ...(parsed.data.trending !== undefined ? { trending: parsed.data.trending } : {}),
    },
  }

  const { result } = await updateProductsWorkflow(req.scope).run({
    input: {
      selector: { id },
      update,
    },
  })

  const updated = Array.isArray(result) ? result[0] : result
  res.json({
    medusa: updated,
    frontend: updated ? mapMedusaProductToFrontend(updated) : null,
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

  await deleteProductsWorkflow(req.scope).run({ input: { ids: [id] } })
  res.status(204).send()
}
