import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"
import { mapMedusaCategoryToFrontend } from "../../_shared/frontend"

const CreateCategorySchema = z.object({
  name: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255).optional(),
  details: z.string().trim().max(10_000).optional(),
  parent_id: z.string().trim().min(1).optional(),
  icon: z.string().trim().min(1).optional(),
  image: z.string().trim().min(1).optional(),
  is_active: z.boolean().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: [
      "id",
      "name",
      "handle",
      "description",
      "metadata",
      "parent_category_id",
      "created_at",
      "updated_at",
      "category_children.*",
      "category_children.metadata",
    ],
    pagination: { skip: 0, take: 200 },
  })

  res.json({
    data: (categories ?? []).map((c: any) => ({
      medusa: c,
      frontend: mapMedusaCategoryToFrontend(c),
    })),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = CreateCategorySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() })
    return
  }

  const handle =
    parsed.data.slug ??
    parsed.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")

  const metadata: Record<string, unknown> = {}
  if (parsed.data.icon) metadata.icon = parsed.data.icon
  if (parsed.data.image) metadata.image = parsed.data.image

  const { createProductCategoriesWorkflow } = await import("@medusajs/medusa/core-flows")
  const { result } = await createProductCategoriesWorkflow(req.scope).run({
    input: {
      product_categories: [
        {
          name: parsed.data.name,
          handle,
          description: parsed.data.details,
          ...(parsed.data.parent_id ? { parent_category_id: parsed.data.parent_id } : {}),
          ...(parsed.data.is_active !== undefined ? { is_active: parsed.data.is_active } : {}),
          ...(Object.keys(metadata).length ? { metadata } : {}),
        },
      ],
    },
  })

  const created = result?.[0]
  res.status(201).json({
    medusa: created,
    frontend: created ? mapMedusaCategoryToFrontend(created) : null,
  })
}

