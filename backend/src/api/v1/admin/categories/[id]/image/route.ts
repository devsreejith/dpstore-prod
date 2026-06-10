import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { mapMedusaCategoryToFrontend } from "../../../../_shared/frontend"
import crypto from "crypto"
import path from "path"
import { ensureMultipartParsed } from "../../../../_shared/helpers"

function getAllowedOrigins() {
  const raw = [
    process.env.STORE_CORS,
    process.env.ADMIN_CORS,
    process.env.AUTH_CORS,
    process.env.FILE_CORS,
  ]
    .filter((v) => typeof v === "string" && v.trim().length)
    .join(",")

  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (!entries.length && (process.env.NODE_ENV || "development") !== "production") {
    entries.push("http://localhost:3000", "http://127.0.0.1:3000")
  }

  const allowAny = entries.includes("*")
  const exact = new Set(entries.map((e) => e.replace(/\/$/, "")))
  return { allowAny, exact }
}

function applyCors(req: any, res: any) {
  const originRaw = req.headers?.origin as string | undefined
  if (!originRaw) return
  const origin = String(originRaw).replace(/\/$/, "")

  const { allowAny, exact } = getAllowedOrigins()
  if (!allowAny && !exact.has(origin)) return

  res.setHeader("Access-Control-Allow-Origin", originRaw)
  res.setHeader("Vary", "Origin")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] || "Content-Type, Authorization"
  )
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
}

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  applyCors(req, res)
  res.status(204).end()
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  applyCors(req, res)
  try {
    await ensureMultipartParsed(req as any, res as any)
  } catch (e: any) {
    res.status(400).json({ message: String(e?.message ?? "Upload failed") })
    return
  }
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

  const file =
    ((req as any).file as Express.Multer.File | undefined) ||
    (((req as any).files as Express.Multer.File[] | undefined)?.[0] as
      | Express.Multer.File
      | undefined)
  if (!file) {
    res.status(400).json({ message: "No file uploaded" })
    return
  }

  const ext = path.extname(file.originalname || "").toLowerCase()
  const filename = `${crypto.randomUUID()}${ext || ".jpg"}`

  const { uploadFilesWorkflow } = await import("@medusajs/core-flows")
  const { result: uploadResult } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: [
        {
          filename,
          mimeType: file.mimetype || "image/jpeg",
          content: file.buffer.toString("base64"),
          access: "public",
        },
      ],
    },
  })

  const url = uploadResult?.[0]?.url
  if (!url) {
    res.status(500).json({ message: "File upload failed" })
    return
  }

  const { updateProductCategoriesWorkflow } = await import("@medusajs/medusa/core-flows")
  const { result } = await updateProductCategoriesWorkflow(req.scope).run({
    input: {
      selector: { id },
      update: {
        metadata: {
          image: { original: url, thumbnail: url },
        },
      },
    },
  })

  const updated = Array.isArray(result) ? result[0] : result
  res.json({
    url,
    medusa: updated,
    frontend: updated ? mapMedusaCategoryToFrontend(updated) : null,
  })
}
