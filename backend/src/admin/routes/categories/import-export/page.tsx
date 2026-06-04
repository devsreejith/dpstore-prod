import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button } from "@medusajs/ui"
import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"

type Category = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
  description?: string | null
  is_active?: boolean
  metadata?: Record<string, any> | null
  category_children?: Category[]
}

function safeString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v)
}

function slugify(input: string): string {
  return safeString(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

function csvEscape(value: unknown): string {
  const s = safeString(value)
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
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

  if (cell.length || cur.length) {
    pushCell()
    pushRow()
  }

  const header = rows[0] ?? []
  const out: Array<Record<string, string>> = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    if (!row.some((c) => safeString(c).trim().length)) continue
    const obj: Record<string, string> = {}
    for (let c = 0; c < header.length; c++) {
      const key = safeString(header[c]).trim()
      if (!key) continue
      obj[key] = safeString(row[c] ?? "").trim()
    }
    out.push(obj)
  }
  return out
}

function normalizeKey(input: string): string {
  return safeString(input).trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function readField(row: Record<string, string>, keys: string[]): string {
  const byNorm: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) byNorm[normalizeKey(k)] = v
  for (const k of keys) {
    const v = byNorm[normalizeKey(k)]
    if (safeString(v).trim().length) return safeString(v).trim()
  }
  return ""
}

function walkTreeToRows(categories: Category[]) {
  const rows: Array<{
    level1: string
    level2: string
    level3: string
    handle: string
    icon: string
    image: string
    is_active: string
    details: string
  }> = []

  const walk = (c: Category, path: string[]) => {
    const nextPath = [...path, safeString(c?.name).trim()].filter(Boolean)
    const level1 = nextPath[0] ?? ""
    const level2 = nextPath[1] ?? ""
    const level3 = nextPath[2] ?? ""
    const icon = safeString(c?.metadata?.icon ?? "").trim()
    const image = safeString(c?.metadata?.image ?? "").trim()
    const isActive =
      typeof c?.is_active === "boolean" ? (c.is_active ? "true" : "false") : ""
    const details = safeString(c?.description ?? "").trim()

    rows.push({
      level1,
      level2,
      level3,
      handle: safeString(c?.handle).trim(),
      icon,
      image,
      is_active: isActive,
      details,
    })

    const children = Array.isArray(c?.category_children) ? c.category_children : []
    for (const child of children) walk(child, nextPath)
  }

  for (const root of categories) walk(root, [])
  return rows
}

function buildCategoryIndex(categories: Category[]) {
  const byId = new Map<string, Category>()
  const byHandle = new Map<string, Category>()
  const byParentAndName = new Map<string, Category>()

  const walk = (c: Category) => {
    if (!c?.id) return
    byId.set(c.id, c)
    if (c.handle) byHandle.set(c.handle, c)
    const parent = safeString(c.parent_category_id).trim()
    const name = safeString(c.name).trim().toLowerCase()
    if (name) byParentAndName.set(`${parent}|${name}`, c)
    const children = Array.isArray(c.category_children) ? c.category_children : []
    for (const child of children) walk(child)
  }

  for (const root of categories) walk(root)
  return { byId, byHandle, byParentAndName }
}

type ImportResult = { row: number; ok: boolean; message: string }

const CategoriesImportExportPage = () => {
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState("")
  const [results, setResults] = useState<ImportResult[]>([])

  const categoriesQuery = useQuery({
    queryKey: ["admin", "product-categories.tree"],
    queryFn: async () => {
      const res: any = await (sdk as any).admin.productCategory.list({
        limit: 1000,
        include_descendants_tree: true,
        fields: "id,name,handle,parent_category_id,description,is_active,metadata,category_children",
      })
      return (res?.product_categories ?? []) as Category[]
    },
  })

  const exportCsv = useMemo(() => {
    const rows = walkTreeToRows(categoriesQuery.data ?? [])
    const header = ["Level 1", "Level 2", "Level 3", "Handle", "Icon", "Image", "Is Active", "Details"]
    const lines = [header.map(csvEscape).join(",")]
    for (const r of rows) {
      lines.push(
        [
          r.level1,
          r.level2,
          r.level3,
          r.handle,
          r.icon,
          r.image,
          r.is_active,
          r.details,
        ]
          .map(csvEscape)
          .join(",")
      )
    }
    return lines.join("\n")
  }, [categoriesQuery.data])

  const importMutation = useMutation({
    mutationFn: async () => {
      const text = csvText.trim().length
        ? csvText
        : file
        ? await file.text()
        : ""
      if (!text.trim().length) throw new Error("No CSV provided")

      const rows = parseCsv(text)
      const tree = categoriesQuery.data ?? []
      const index = buildCategoryIndex(tree)

      const out: ImportResult[] = []

      const ensureCategory = async (
        nameRaw: string,
        parentId: string | null,
        extras?: any,
        slugOverride?: string
      ) => {
        const name = safeString(nameRaw).trim()
        if (!name) return null

        const key = `${safeString(parentId).trim()}|${name.toLowerCase()}`
        const slug = (slugOverride ? safeString(slugOverride).trim() : "") || slugify(name)
        const byHandle = slug ? index.byHandle.get(slug) : undefined
        if (byHandle?.id) return byHandle
        const existing = index.byParentAndName.get(key)
        if (existing?.id) return existing

        const createResp = await fetch("/api/v1/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            ...(parentId ? { parent_id: parentId } : {}),
            ...(extras?.icon ? { icon: safeString(extras.icon).trim() } : {}),
            ...(extras?.image ? { image: safeString(extras.image).trim() } : {}),
            ...(typeof extras?.is_active === "boolean" ? { is_active: extras.is_active } : {}),
            ...(extras?.details ? { details: safeString(extras.details).trim() } : {}),
          }),
          credentials: "include",
        })
        if (!createResp.ok) {
          const errText = await createResp.text()
          throw new Error(errText || "Create failed")
        }
        const created: any = await createResp.json()
        const createdMedusa = (created?.medusa ?? created) as Category
        if (!createdMedusa?.id) throw new Error("Create failed")

        index.byId.set(createdMedusa.id, createdMedusa)
        if (createdMedusa.handle) index.byHandle.set(createdMedusa.handle, createdMedusa)
        index.byParentAndName.set(key, createdMedusa)
        return createdMedusa
      }

      const updateCategory = async (id: string, extras: any) => {
        const patch: any = {}
        if (extras?.slug !== undefined) patch.slug = extras.slug ? safeString(extras.slug).trim() : ""
        if (extras?.icon !== undefined) patch.icon = extras.icon ? safeString(extras.icon).trim() : null
        if (extras?.image !== undefined) patch.image = extras.image ? safeString(extras.image).trim() : null
        if (extras?.details !== undefined) patch.details = extras.details ? safeString(extras.details).trim() : ""
        if (typeof extras?.is_active === "boolean") patch.is_active = extras.is_active
        if (!Object.keys(patch).length) return

        const resp = await fetch(`/api/v1/admin/categories/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
          credentials: "include",
        })
        if (!resp.ok) {
          const errText = await resp.text()
          throw new Error(errText || "Update failed")
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const rowNumber = i + 2
        const row = rows[i]
        try {
          const level1 = readField(row, ["Level 1", "Level1", "Main Category", "Main"])
          const level2 = readField(row, ["Level 2", "Level2", "Category"])
          const level3 = readField(row, ["Level 3", "Level3", "Sub Category", "Child"])
          const handle = readField(row, ["Handle", "Slug"])
          const icon = readField(row, ["Icon"])
          const image = readField(row, ["Image"])
          const details = readField(row, ["Details", "Description"])
          const isActiveRaw = readField(row, ["Is Active", "Active", "is_active"])
          const is_active =
            isActiveRaw.trim().length === 0
              ? undefined
              : ["1", "true", "yes", "y"].includes(isActiveRaw.trim().toLowerCase())

          if (!level1) throw new Error("Missing Level 1")

          const c1 = await ensureCategory(level1, null, undefined, !level2 && !level3 ? handle : undefined)
          if (!c1?.id) throw new Error("Failed to ensure Level 1")

          let target = c1
          if (level2) {
            const c2 = await ensureCategory(level2, c1.id, undefined, level2 && !level3 ? handle : undefined)
            if (!c2?.id) throw new Error("Failed to ensure Level 2")
            target = c2
          }
          if (level3) {
            const c3 = await ensureCategory(
              level3,
              target.id,
              { icon, image, details, is_active },
              handle
            )
            if (!c3?.id) throw new Error("Failed to ensure Level 3")
            target = c3
          } else {
            await updateCategory(target.id, { slug: handle || undefined, icon, image, details, is_active })
          }

          if (level3) {
            await updateCategory(target.id, { slug: handle || undefined, icon, image, details, is_active })
          }

          out.push({ row: rowNumber, ok: true, message: "OK" })
        } catch (e: any) {
          out.push({ row: rowNumber, ok: false, message: safeString(e?.message || "Failed") })
        }
      }

      setResults(out)
      await categoriesQuery.refetch()
    },
  })

  const downloadExport = () => {
    const blob = new Blob([exportCsv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "categories-export.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 500)
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Categories Import / Export</Heading>
      </div>

      <div className="px-6 py-4 space-y-6">
        <div className="space-y-2">
          <div className="text-sm">Export current categories (Level 1 / Level 2 / Level 3)</div>
          <Button onClick={downloadExport} disabled={categoriesQuery.isLoading || categoriesQuery.isError}>
            Download CSV Export
          </Button>
        </div>

        <div className="space-y-3">
          <div className="text-sm">Import categories from CSV</div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
              setResults([])
              setCsvText("")
            }}
          />
          <div className="grid grid-cols-1 gap-2">
            <textarea
              placeholder="Or paste CSV here (optional)"
              className="w-full border rounded px-3 py-2 min-h-[120px]"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
          </div>
          <Button
            isLoading={importMutation.isPending}
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || categoriesQuery.isLoading}
          >
            Import CSV
          </Button>
        </div>

        {results.length ? (
          <div className="overflow-auto border rounded">
            <table className="min-w-[500px] w-full text-sm">
              <thead>
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
  label: "Categories Import/Export",
})

export default CategoriesImportExportPage
