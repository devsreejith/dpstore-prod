import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ProductListQuerySchema,
  buildPaginatorInfo,
  mapMedusaProductToFrontend,
  populateProductsInventory,
} from "../_shared/frontend"

async function resolveCategoryDescendantIdsByHandles(query: any, handles: string[]): Promise<string[]> {
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "parent_category_id"],
    pagination: { skip: 0, take: 500 },
  })

  const rows = Array.isArray(data) ? data : []
  const byHandle = new Map<string, string>()
  const childrenById = new Map<string, string[]>()

  for (const c of rows) {
    const id = String(c?.id ?? "").trim()
    const h = String(c?.handle ?? "").trim()
    const parentId = String(c?.parent_category_id ?? "").trim()
    if (id) {
      if (h) byHandle.set(h, id)
      if (parentId) {
        const list = childrenById.get(parentId) ?? []
        list.push(id)
        childrenById.set(parentId, list)
      }
    }
  }

  const rootIds = handles
    .map((h) => byHandle.get(String(h ?? "").trim()))
    .filter((id): id is string => !!id)

  if (!rootIds.length) return []

  const out: string[] = []
  const seen = new Set<string>()
  const queue: string[] = [...rootIds]

  while (queue.length) {
    const id = queue.shift() as string
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    const kids = childrenById.get(id) ?? []
    for (const k of kids) queue.push(k)
  }

  return out
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = ProductListQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid query", errors: parsed.error.flatten() })
    return
  }

  const { page, limit, q, category, tag, min_price, max_price, price, in_stock, sort, featured, related_to, handle, collection_id, offset, region_id } =
    parsed.data
  const skip = offset !== undefined ? offset : (page - 1) * limit
  const take = limit

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const isSearch = !!q
  const filters: Record<string, unknown> = {}
  if (featured !== undefined) filters.metadata = { ...(filters.metadata as any), featured }
  if (handle) {
    const handles = handle.split(",").map((h) => h.trim()).filter(Boolean)
    if (handles.length > 1) {
      filters.handle = handles
    } else if (handles.length === 1) {
      filters.handle = handles[0]
    }
  }
  if (collection_id) filters.collection_id = collection_id
  if (category) {
    const handles = category.split(",").map((h) => h.trim()).filter(Boolean)
    if (handles.length) {
      const ids = await resolveCategoryDescendantIdsByHandles(query, handles)
      filters.categories = ids.length ? { id: ids } : { handle: handles }
    }
  }

  const tags = Array.isArray(tag) ? tag : tag ? tag.split(",") : []
  if (tags.length) filters.tags = { value: tags }

  if (related_to) {
    const { data: relatedBase } = await query.graph({
      entity: "product",
      fields: ["id", "categories.id", "categories.handle"],
      filters: { handle: related_to },
    })

    const base = relatedBase?.[0]
    const categoryIds = (base?.categories ?? []).map((c: any) => c?.id).filter(Boolean)
    if (categoryIds.length) {
      filters.categories = { id: categoryIds }
    }
    if (base?.id) {
      filters.id = { $ne: base.id }
    }
  }

  const { data: products, metadata } = await query.graph({
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
      "collection.id",
      "collection.title",
      "collection.handle",
      "options.*",
      "options.values.*",
    ],
    filters,
    pagination: isSearch ? { skip: 0, take: 1000 } : { skip, take },
    context: region_id ? { region_id } : undefined,
  })

  // Populate real inventory levels on variants
  await populateProductsInventory(products, query)

  // Calculate prices on variants
  for (const product of products ?? []) {
    for (const variant of product.variants ?? []) {
      const v = variant as any
      let price = v.calculated_price?.calculated_amount ?? 0
      if (!price) {
        const prices = Array.isArray(v.prices) ? v.prices : []
        const aedPrice = prices.find((p: any) => String(p?.currency_code || p?.currencyCode || "").toLowerCase() === "aed")
        const fallback = aedPrice ?? prices[0]
        price = fallback?.amount ?? fallback?.value ?? 0
      }
      v.calculated_price = {
        ...v.calculated_price,
        calculated_amount: price
      }
    }
  }

  let filtered = products ?? []
  if (min_price !== undefined) {
    filtered = filtered.filter((p) => {
      const price = (p.variants?.[0] as any)?.calculated_price?.calculated_amount ?? 0
      return price >= min_price
    })
  }
  if (max_price !== undefined) {
    filtered = filtered.filter((p) => {
      const price = (p.variants?.[0] as any)?.calculated_price?.calculated_amount ?? 0
      return price <= max_price
    })
  }
  if (price) {
    const ranges = price.split(",").map((r) => r.trim()).filter(Boolean)
    if (ranges.length) {
      filtered = filtered.filter((p) => {
        const productPrice = (p.variants?.[0] as any)?.calculated_price?.calculated_amount ?? 0
        return ranges.some((range) => {
          const parts = range.split("-")
          const min = parts[0] ? Number(parts[0]) : 0
          const max = parts[1] ? Number(parts[1]) : Infinity
          return productPrice >= min && productPrice <= max
        })
      })
    }
  }
  if (in_stock !== undefined) {
    filtered = filtered.filter((p) => {
      const qty = (p.variants ?? []).reduce((sum: number, v: any) => sum + Number(v.inventory_quantity ?? 0), 0)
      return in_stock ? qty > 0 : qty <= 0
    })
  }

  if (sort) {
    filtered = [...filtered]
    if (sort === "price_asc") {
      filtered.sort((a, b) => ((a.variants?.[0] as any)?.calculated_price?.calculated_amount ?? 0) - ((b.variants?.[0] as any)?.calculated_price?.calculated_amount ?? 0))
    }
    if (sort === "price_desc") {
      filtered.sort((a, b) => ((b.variants?.[0] as any)?.calculated_price?.calculated_amount ?? 0) - ((a.variants?.[0] as any)?.calculated_price?.calculated_amount ?? 0))
    }
    if (sort === "name_asc") {
      filtered.sort((a, b) => String(a.title).localeCompare(String(b.title)))
    }
    if (sort === "name_desc") {
      filtered.sort((a, b) => String(b.title).localeCompare(String(a.title)))
    }
    if (sort === "newest") {
      filtered.sort((a, b) => new Date((b.created_at as string) || 0).getTime() - new Date((a.created_at as string) || 0).getTime())
    }
    if (sort === "oldest") {
      filtered.sort((a, b) => new Date((a.created_at as string) || 0).getTime() - new Date((b.created_at as string) || 0).getTime())
    }
  }

  if (isSearch && q) {
    const searchTerms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const scoredProducts = filtered.map((p) => {
      let score = 0;
      const titleLower = String(p.title ?? "").toLowerCase();
      const descLower = String(p.description ?? "").toLowerCase();
      
      // Extract categories
      const categoryNames = (p.categories ?? []).map((c: any) => String(c?.name ?? "").toLowerCase());
      
      // Extract collection
      const collectionTitle = String(p.collection?.title ?? "").toLowerCase();
      
      // Extract tags
      const tagNames = (p.tags ?? []).map((t: any) => String(t?.value ?? t?.name ?? "").toLowerCase());
      
      // Extract SKUs
      const skus = (p.variants ?? []).map((v: any) => String(v?.sku ?? "").toLowerCase());
      
      // Extract brand (from metadata)
      const brand = String(p.metadata?.brand || p.metadata?.Brand || "").toLowerCase();

      for (const term of searchTerms) {
        let termMatched = false;
        
        // 1. SKU Match (highest priority)
        for (const sku of skus) {
          if (sku === term) {
            score += 150;
            termMatched = true;
          } else if (sku.startsWith(term)) {
            score += 80;
            termMatched = true;
          } else if (sku.includes(term)) {
            score += 40;
            termMatched = true;
          }
        }

        // 2. Product Name/Title Match
        if (titleLower === term) {
          score += 100;
          termMatched = true;
        } else if (titleLower.startsWith(term)) {
          score += 50;
          termMatched = true;
        } else if (titleLower.includes(term)) {
          score += 20;
          termMatched = true;
        }

        // 3. Category Match
        for (const cat of categoryNames) {
          if (cat === term) {
            score += 60;
            termMatched = true;
          } else if (cat.includes(term)) {
            score += 20;
            termMatched = true;
          }
        }

        // 4. Brand Match
        if (brand) {
          if (brand === term) {
            score += 50;
            termMatched = true;
          } else if (brand.includes(term)) {
            score += 15;
            termMatched = true;
          }
        }

        // 5. Collection Match
        if (collectionTitle) {
          if (collectionTitle === term) {
            score += 50;
            termMatched = true;
          } else if (collectionTitle.includes(term)) {
            score += 15;
            termMatched = true;
          }
        }

        // 6. Tag Match
        for (const tVal of tagNames) {
          if (tVal === term) {
            score += 40;
            termMatched = true;
          } else if (tVal.includes(term)) {
            score += 10;
            termMatched = true;
          }
        }

        // 7. Description Match
        if (descLower.includes(term)) {
          score += 5;
          termMatched = true;
        }
      }

      return { product: p, score };
    });

    // Filter to only products that matched at least one term
    const matched = scoredProducts.filter(item => item.score > 0);
    
    // Sort by relevance score descending by default
    if (!sort) {
      matched.sort((a, b) => b.score - a.score);
    }
    
    filtered = matched.map(item => item.product);
  }

  const total = isSearch ? filtered.length : Number(metadata?.count ?? filtered.length);
  if (isSearch) {
    filtered = filtered.slice(skip, skip + limit);
  }

  res.json({
    products: filtered,
    count: total,
    limit,
    offset: skip
  })
}

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  res.status(204).end()
}
