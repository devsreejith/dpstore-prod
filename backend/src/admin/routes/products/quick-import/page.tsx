import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input } from "@medusajs/ui"
import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"

type Category = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
  category_children?: Category[]
}

type Collection = { id: string; title: string }

function safeString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v)
}

function normalizeKey(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = []
  let cur: string[] = []
  let cell = ""
  let inQuotes = false

  const pushCell = () => {
    cur.push(cell)
    cell = ""
  }
  const pushRow = () => {
    rows.push(cur)
    cur = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = i + 1 < text.length ? text[i + 1] : ""

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
        continue
      }
      if (ch === '"') {
        inQuotes = false
        continue
      }
      cell += ch
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    if (ch === ",") {
      pushCell()
      continue
    }

    if (ch === "\r") continue

    if (ch === "\n") {
      pushCell()
      pushRow()
      continue
    }

    cell += ch
  }

  pushCell()
  if (cur.length > 1 || (cur.length === 1 && cur[0] !== "")) pushRow()

  const header = (rows.shift() ?? []).map((h) => normalizeKey(h))
  const out: Array<Record<string, string>> = []
  for (const r of rows) {
    const obj: Record<string, string> = {}
    header.forEach((k, idx) => {
      if (!k) return
      obj[k] = String(r[idx] ?? "").trim()
    })
    const anyValue = Object.values(obj).some((v) => v.trim().length)
    if (anyValue) out.push(obj)
  }
  return out
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
  for (const c of all) {
    const parentId = c.parent_category_id
    if (!parentId) continue
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

  const findChildByName = (parentId: string, name: string) => {
    const list = childrenByParent.get(parentId) ?? []
    const needle = name.trim().toLowerCase()
    return list.find((c) => c.name.trim().toLowerCase() === needle)
  }

  const findRootByName = (name: string) => {
    const needle = name.trim().toLowerCase()
    return roots.find((c) => c.name.trim().toLowerCase() === needle)
  }

  const resolveHandleFromPath = (l1: string, l2: string, l3: string) => {
    if (!l1.trim()) return ""
    const root = findRootByName(l1)
    if (!root) return ""
    if (!l2.trim()) return root.handle
    const c2 = findChildByName(root.id, l2)
    if (!c2) return ""
    if (!l3.trim()) return c2.handle
    const c3 = findChildByName(c2.id, l3)
    return c3?.handle ?? ""
  }

  return { roots, byId, resolveHandleFromPath }
}

function buildTemplateCsv(): string {
  const header = [
    "Level 1",
    "Level 2",
    "Level 3",
    "Title",
    "Item code",
    "Price",
    "Collections",
  ]
  const example = [
    "Gifts & Souvenirs",
    "Bags & Wallets",
    "Bags & Pouches",
    "DP Product Name",
    "DP-38-0001",
    "50",
    "SWAT Collection",
  ]
  const toLine = (cells: string[]) =>
    cells
      .map((c) => {
        const s = String(c ?? "")
        if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
        return s
      })
      .join(",")
  return `${toLine(header)}\n${toLine(example)}\n`
}

const QuickImportProductsPage = () => {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState("")
  const [results, setResults] = useState<Array<{ row: number; ok: boolean; message: string }>>(
    []
  )

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
      return (res?.collections ?? []) as Collection[]
    },
  })

  const categoryIndex = useMemo(() => {
    return buildCategoryIndex(categoriesQuery.data ?? [])
  }, [categoriesQuery.data])

  const collectionsByTitle = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of collectionsQuery.data ?? []) {
      const t = safeString(c?.title).trim().toLowerCase()
      const id = safeString(c?.id).trim()
      if (t && id) m.set(t, id)
    }
    return m
  }, [collectionsQuery.data])

  const loadFileMutation = useMutation({
    mutationFn: async () => {
      if (!file) return
      const raw = await file.text()
      setText(raw)
    },
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      const rows = parseCsv(text)
      const out: Array<{ row: number; ok: boolean; message: string }> = []

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const rowNumber = i + 2
        try {
          const title = safeString(r.title).trim()
          const itemCode = safeString(r.itemcode).trim()
          const priceRaw = safeString(r.price || r.priceaed).trim()
          const l1 = safeString(r.level1).trim()
          const l2 = safeString(r.level2).trim()
          const l3 = safeString(r.level3).trim()
          const collectionTitle = safeString(r.collections || r.collection).trim().toLowerCase()
          const newArrival = safeString(r.newarrival).trim().toLowerCase() === "true"
          const trending = safeString(r.trending).trim().toLowerCase() === "true"

          if (!title || !itemCode || !priceRaw || !l1) {
            throw new Error("Missing required fields")
          }

          const price = Number(priceRaw)
          if (!Number.isFinite(price) || price < 0) throw new Error("Invalid price")

          const categoryHandle = categoryIndex.resolveHandleFromPath(l1, l2, l3)
          if (!categoryHandle) throw new Error("Category path not found")

          const collectionId = collectionTitle ? collectionsByTitle.get(collectionTitle) : undefined

          const payload: any = {
            name: title,
            item_code: itemCode,
            price,
            category_slugs: [categoryHandle],
            isNewArrival: newArrival,
            trending,
            ...(collectionId ? { collection_id: collectionId } : {}),
          }

          const resp = await fetch("/api/v1/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include",
          })
          if (!resp.ok) {
            const errText = await resp.text()
            throw new Error(errText || "Create failed")
          }

          out.push({ row: rowNumber, ok: true, message: "Created" })
        } catch (e: any) {
          out.push({ row: rowNumber, ok: false, message: safeString(e?.message || "Failed") })
        }
      }

      setResults(out)
    },
  })

  const downloadTemplate = () => {
    const csv = buildTemplateCsv()
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "dp-products-quick-import-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4 flex items-center justify-between">
        <Heading level="h2">Quick Import Products</Heading>
        <Button variant="secondary" size="small" onClick={downloadTemplate}>
          Download Quick Template (CSV)
        </Button>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile((e.target.files ?? [])[0] ?? null)}
          />
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="small"
              onClick={() => loadFileMutation.mutate()}
              isLoading={loadFileMutation.isPending}
              disabled={!file || loadFileMutation.isPending}
            >
              Load CSV
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={() => importMutation.mutate()}
              isLoading={importMutation.isPending}
              disabled={!text.trim() || importMutation.isPending}
            >
              Import
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Input
            placeholder="CSV preview"
            value={text.split("\n").slice(0, 1).join("\n")}
            readOnly
          />
        </div>

        {results.length ? (
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ui-bg-subtle">
                <tr>
                  <th className="text-left p-3">Row</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={`${r.row}-${r.ok}`} className="border-t">
                    <td className="p-3">{r.row}</td>
                    <td className="p-3">{r.ok ? "OK" : "Failed"}</td>
                    <td className="p-3">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Quick Import (Template)",
})

export default QuickImportProductsPage
