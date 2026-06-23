import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input } from "@medusajs/ui"
import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"
import { useNavigate } from "react-router-dom"

type Category = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
  category_children?: Category[]
}

function safeString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v)
}

function flattenCategories(categories: Category[]): Category[] {
  const out: Category[] = []
  const seen = new Set<string>()
  const walk = (c: Category) => {
    if (!c?.id) return
    if (seen.has(c.id)) return
    seen.add(c.id)
    out.push(c)
    const children = Array.isArray(c.category_children) ? c.category_children : []
    for (const child of children) walk(child)
  }
  for (const c of categories) walk(c)
  return out
}

function buildCategoryIndex(categories: Category[]) {
  const all = flattenCategories(categories)
  const byId = new Map<string, Category>()
  for (const c of all) byId.set(c.id, c)

  const childrenByParent = new Map<string, Category[]>()
  const childIdByParent = new Map<string, Set<string>>()
  for (const c of all) {
    const parentId = c.parent_category_id
    if (!parentId) continue
    const ids = childIdByParent.get(parentId) ?? new Set<string>()
    if (ids.has(c.id)) continue
    ids.add(c.id)
    childIdByParent.set(parentId, ids)
    const list = childrenByParent.get(parentId) ?? []
    list.push(c)
    childrenByParent.set(parentId, list)
  }

  for (const [k, list] of childrenByParent.entries()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
    childrenByParent.set(k, list)
  }

  const roots = all
    .filter((c) => !c.parent_category_id)
    .sort((a, b) => a.name.localeCompare(b.name))

  return { byId, childrenByParent, roots }
}

const QuickAddProductPage = () => {
  const navigate = useNavigate()

  const [title, setTitle] = useState("")
  const [itemCode, setItemCode] = useState("")
  const [price, setPrice] = useState("")
  const [newArrival, setNewArrival] = useState(false)
  const [trending, setTrending] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [collectionId, setCollectionId] = useState("")

  const categoriesQuery = useQuery({
    queryKey: ["admin", "product-categories"],
    queryFn: async () => {
      const res: any = await (sdk as any).admin.productCategory.list({
        limit: 1000,
        include_descendants_tree: true,
        fields: "id,name,handle,parent_category_id,category_children",
      })
      return (res?.product_categories ?? []) as Category[]
    },
  })

  const collectionsQuery = useQuery({
    queryKey: ["admin", "product-collections"],
    queryFn: async () => {
      const res: any = await (sdk as any).admin.productCollection.list({
        limit: 1000,
      })
      return (res?.collections ?? []) as Array<{ id: string; title: string }>
    },
  })

  const categoryIndex = useMemo(() => {
    return buildCategoryIndex(categoriesQuery.data ?? [])
  }, [categoriesQuery.data])

  const [mainCategoryId, setMainCategoryId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [childCategoryId, setChildCategoryId] = useState("")

  const categoryOptions = mainCategoryId
    ? categoryIndex.childrenByParent.get(mainCategoryId) ?? []
    : []
  const childOptions = categoryId
    ? categoryIndex.childrenByParent.get(categoryId) ?? []
    : []

  const selectedCategoryId = childCategoryId || categoryId || mainCategoryId
  const selectedCategoryHandle = selectedCategoryId
    ? safeString(categoryIndex.byId.get(selectedCategoryId)?.handle).trim()
    : ""

  const requiresCategory = !!mainCategoryId && categoryOptions.length > 0
  const requiresChild = !!categoryId && childOptions.length > 0

  const canSubmit =
    title.trim().length > 0 &&
    itemCode.trim().length > 0 &&
    price.trim().length > 0 &&
    collectionId.trim().length > 0 &&
    !!mainCategoryId &&
    (!requiresCategory || !!categoryId) &&
    (!requiresChild || !!childCategoryId) &&
    !!selectedCategoryHandle

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: title.trim(),
        item_code: itemCode.trim(),
        price: Number(price),
        category_slugs: [selectedCategoryHandle],
        isNewArrival: newArrival,
        trending,
        ...(collectionId.trim() ? { collection_id: collectionId.trim() } : {}),
      }

      const createdResp = await fetch("/api/v1/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      })
      if (!createdResp.ok) {
        const text = await createdResp.text()
        throw new Error(text || "Create failed")
      }
      const created: any = await createdResp.json()

      const productId = safeString(created?.medusa?.id ?? created?.frontend?.id).trim()
      if (!productId) return created

      if (files.length) {
        const form = new FormData()
        for (const f of files) form.append("files", f)
        const resp = await fetch(`/api/v1/admin/products/${productId}/images`, {
          method: "POST",
          body: form,
          credentials: "include",
        })
        if (!resp.ok) {
          const text = await resp.text()
          throw new Error(text || "Image upload failed")
        }
      }

      return { ...created, productId }
    },
    onSuccess: (created: any) => {
      const productId = safeString(created?.productId ?? created?.medusa?.id).trim()
      if (productId) {
        navigate(`/products/${productId}`)
      }
    },
  })

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Quick Add Product</Heading>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <Input
            placeholder="Title (required)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="Item Code / SKU (required)"
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Price (AED) (required)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
            />
            <div />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {collectionsQuery.isLoading ? (
            <div className="text-sm">Loading collections…</div>
          ) : collectionsQuery.isError ? (
            <div className="text-sm text-ui-fg-error">Failed to load collections</div>
          ) : (
            <select
              className="w-full border rounded px-3 py-2"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
            >
              <option value="">Collection (required)</option>
              {(collectionsQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {categoriesQuery.isLoading ? (
            <div className="text-sm">Loading categories…</div>
          ) : categoriesQuery.isError ? (
            <div className="text-sm text-ui-fg-error">Failed to load categories</div>
          ) : (
            <>
              <select
                className="w-full border rounded px-3 py-2"
                value={mainCategoryId}
                onChange={(e) => {
                  setMainCategoryId(e.target.value)
                  setCategoryId("")
                  setChildCategoryId("")
                }}
              >
                <option value="">Main Category (required)</option>
                {categoryIndex.roots.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="w-full border rounded px-3 py-2"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value)
                  setChildCategoryId("")
                }}
                disabled={!mainCategoryId}
              >
                <option value="">
                  {`Sub Category${requiresCategory ? " (required)" : ""}`}
                </option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="w-full border rounded px-3 py-2"
                value={childCategoryId}
                onChange={(e) => setChildCategoryId(e.target.value)}
                disabled={!categoryId}
              >
                <option value="">
                  {`Child Category${requiresChild ? " (required)" : ""}`}
                </option>
                {childOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newArrival}
              onChange={(e) => setNewArrival(e.target.checked)}
            />
            <span>New Arrival</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={trending}
              onChange={(e) => setTrending(e.target.checked)}
            />
            <span>Trending</span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          <div className="text-sm text-ui-fg-subtle">
            Images are uploaded to /uploads and will be used as the product gallery.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => createMutation.mutate()}
            isLoading={createMutation.isPending}
            disabled={!canSubmit || createMutation.isPending}
          >
            Create
          </Button>
          {createMutation.isError ? (
            <span className="text-ui-fg-error text-sm">
              {safeString((createMutation.error as any)?.message || "Create failed")}
            </span>
          ) : null}
          {!canSubmit ? (
            <span className="text-ui-fg-subtle text-sm">Fill required fields</span>
          ) : null}
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Quick Add Product",
})

export default QuickAddProductPage
