import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  deleteProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"
import { z } from "zod"
import { mapMedusaCategoryToFrontend } from "../../../_shared/frontend"

const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  slug: z.string().trim().min(1).max(255).optional(),
  details: z.string().trim().max(10_000).optional(),
  parent_id: z.string().trim().min(1).nullable().optional(),
  icon: z.string().trim().min(1).nullable().optional(),
  image: z.string().trim().min(1).nullable().optional(),
  is_active: z.boolean().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
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
    filters: { id },
  })

  const category = data?.[0]
  if (!category) {
    res.status(404).json({ message: "Category not found" })
    return
  }

  res.json({ medusa: category, frontend: mapMedusaCategoryToFrontend(category) })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

  const parsed = UpdateCategorySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() })
    return
  }

  const update: Record<string, unknown> = {}
  if (parsed.data.name) update.name = parsed.data.name
  if (parsed.data.slug) update.handle = parsed.data.slug
  if (parsed.data.details !== undefined) update.description = parsed.data.details
  if (parsed.data.parent_id !== undefined) update.parent_category_id = parsed.data.parent_id
  if (parsed.data.is_active !== undefined) update.is_active = parsed.data.is_active

  const metadata: Record<string, unknown> = {}
  if (parsed.data.icon !== undefined) metadata.icon = parsed.data.icon ?? undefined
  if (parsed.data.image !== undefined) metadata.image = parsed.data.image ?? undefined
  if (Object.keys(metadata).length) update.metadata = metadata

  const { result } = await updateProductCategoriesWorkflow(req.scope).run({
    input: {
      selector: { id },
      update,
    },
  })

  const updated = Array.isArray(result) ? result[0] : result
  res.json({
    medusa: updated,
    frontend: updated ? mapMedusaCategoryToFrontend(updated) : null,
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

  await deleteProductCategoriesWorkflow(req.scope).run({ input: [id] })
  res.status(204).send()
}
