import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input, Textarea } from "@medusajs/ui"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

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

function safeBool(v: unknown): boolean {
  return v === true
}

function safeNumber(v: unknown): string {
  if (v == null) return ""
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? String(n) : ""
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

  return { all, byId, childrenByParent, roots }
}

function getCategoryPath(categoryId: string, byId: Map<string, Category>): string[] {
  const out: string[] = []
  let cur = byId.get(categoryId)
  while (cur) {
    out.push(cur.id)
    cur = cur.parent_category_id ? byId.get(cur.parent_category_id) : undefined
  }
  return out.reverse()
}

const ProductCatalogManager = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const qc = useQueryClient()
  const productId = safeString((data as any)?.id).trim()
  const metadata = ((data as any)?.metadata ?? {}) as Record<string, unknown>
  const firstVariantId = safeString(((data as any)?.variants?.[0] as any)?.id).trim()

  const [itemCode, setItemCode] = useState(safeString(metadata.item_code))
  const [shortDescription, setShortDescription] = useState(safeString(metadata.short_description))
  const [retailPrice, setRetailPrice] = useState(safeNumber(metadata.retail_price))
  const [salePrice, setSalePrice] = useState(safeNumber(metadata.sale_price))
  const [backorder, setBackorder] = useState(safeBool(metadata.backorder))
  const [lowStockAlert, setLowStockAlert] = useState(safeNumber(metadata.low_stock_alert))
  const [featured, setFeatured] = useState(safeBool(metadata.featured))
  const [newArrival, setNewArrival] = useState(safeBool(metadata.isNewArrival))
  const [trending, setTrending] = useState(safeBool(metadata.trending))
  const [bestseller, setBestseller] = useState(safeBool(metadata.bestseller))
  const [showAdvanced, setShowAdvanced] = useState(false)

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

  const currentCategoryId = safeString(((data as any)?.categories?.[0] as any)?.id).trim()
  const initialPath = useMemo(() => {
    if (!currentCategoryId) return []
    return getCategoryPath(currentCategoryId, categoryIndex.byId)
  }, [currentCategoryId, categoryIndex.byId])

  const [mainCategoryId, setMainCategoryId] = useState(safeString(initialPath[0]))
  const [categoryId, setCategoryId] = useState(safeString(initialPath[1]))
  const [subcategoryId, setSubcategoryId] = useState(safeString(initialPath[2]))

  const [collectionId, setCollectionId] = useState(
    safeString(((data as any)?.collection_id ?? (data as any)?.collection?.id) ?? "")
  )

  const mainCategoryOptions = categoryIndex.roots
  const categoryOptions = mainCategoryId
    ? categoryIndex.childrenByParent.get(mainCategoryId) ?? []
    : []
  const subcategoryOptions = categoryId
    ? categoryIndex.childrenByParent.get(categoryId) ?? []
    : []

  const isCategoryRequired = mainCategoryId && categoryOptions.length > 0
  const isSubcategoryRequired = categoryId && subcategoryOptions.length > 0
  const isOrganizationValid =
    !!mainCategoryId &&
    (!isCategoryRequired || !!categoryId) &&
    (!isSubcategoryRequired || !!subcategoryId)

  const updateMetadataMutation = useMutation({
    mutationFn: async () => {
      if (!productId) return

      const nextMetadata: Record<string, unknown> = {
        ...metadata,
        item_code: itemCode.trim() || undefined,
        short_description: shortDescription.trim() || undefined,
        retail_price: retailPrice.trim() ? Number(retailPrice) : undefined,
        sale_price: salePrice.trim() ? Number(salePrice) : undefined,
        backorder,
        low_stock_alert: lowStockAlert.trim() ? Number(lowStockAlert) : undefined,
        featured,
        isNewArrival: newArrival,
        trending,
        bestseller,
      }

      Object.keys(nextMetadata).forEach((k) => {
        if (nextMetadata[k] === undefined) delete nextMetadata[k]
      })

      const payload: Record<string, unknown> = {
        metadata: nextMetadata,
      }

      const sku = itemCode.trim()
      if (sku && firstVariantId) {
        payload.variants = [{ id: firstVariantId, sku }]
      }

      await (sdk as any).admin.product.update(productId, payload)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "products"] })
    },
  })

  const updateOrganizationMutation = useMutation({
    mutationFn: async () => {
      if (!productId) return

      const selectedCategoryId = isSubcategoryRequired
        ? subcategoryId
        : isCategoryRequired
          ? categoryId
          : mainCategoryId
      const categories = selectedCategoryId ? [{ id: selectedCategoryId }] : []
      const payload: Record<string, unknown> = {
        ...(categories.length ? { categories } : { categories: [] }),
        ...(collectionId.trim() ? { collection_id: collectionId.trim() } : { collection_id: null }),
      }

      await (sdk as any).admin.product.update(productId, payload)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "products"] })
    },
  })

  if (!productId) {
    return <></>
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Catalog</Heading>
      </div>

      <div className="px-6 py-4 space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <Input
            placeholder="SKU / Item Code"
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Price (AED)"
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value)}
              inputMode="decimal"
            />
            <div />
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
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Hide advanced" : "Show advanced"}
          </Button>
          {showAdvanced ? (
            <div className="grid grid-cols-1 gap-3">
              <Textarea
                placeholder="Short Description"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Sale Price (AED)"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  inputMode="decimal"
                />
                <Input
                  placeholder="Low Stock Alert"
                  value={lowStockAlert}
                  onChange={(e) => setLowStockAlert(e.target.value)}
                  inputMode="numeric"
                />
                <div />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={backorder}
                    onChange={(e) => setBackorder(e.target.checked)}
                  />
                  <span>Backorder</span>
                </label>
                <div />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="small"
            onClick={() => updateMetadataMutation.mutate()}
            isLoading={updateMetadataMutation.isPending}
          >
            Save catalog fields
          </Button>
          {updateMetadataMutation.isError ? (
            <span className="text-ui-fg-error text-sm">Save failed</span>
          ) : null}
        </div>
      </div>

      <div className="px-6 py-4 space-y-3">
        <div className="text-sm font-medium">Organization</div>

        {categoriesQuery.isLoading ? (
          <div className="text-sm">Loading categories…</div>
        ) : categoriesQuery.isError ? (
          <div className="text-sm text-ui-fg-error">Failed to load categories</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <select
              className="w-full border rounded px-3 py-2"
              value={mainCategoryId}
              onChange={(e) => {
                setMainCategoryId(e.target.value)
                setCategoryId("")
                setSubcategoryId("")
              }}
            >
              <option value="">Main Category (required)</option>
              {mainCategoryOptions.map((c) => (
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
                setSubcategoryId("")
              }}
              disabled={!mainCategoryId}
            >
              <option value="">{`Category${isCategoryRequired ? " (required)" : ""}`}</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="w-full border rounded px-3 py-2"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={!categoryId}
            >
              <option value="">{`Subcategory${isSubcategoryRequired ? " (required)" : ""}`}</option>
              {subcategoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
            <option value="">Collection (optional)</option>
            {(collectionsQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="small"
            onClick={() => updateOrganizationMutation.mutate()}
            isLoading={updateOrganizationMutation.isPending}
            disabled={!isOrganizationValid || updateOrganizationMutation.isPending}
          >
            Save organization
          </Button>
          {!isOrganizationValid ? (
            <span className="text-ui-fg-error text-sm">Category selection is required</span>
          ) : null}
          {updateOrganizationMutation.isError ? (
            <span className="text-ui-fg-error text-sm">Save failed</span>
          ) : null}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductCatalogManager
