import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { mapMedusaProductToFrontend } from "../../../../_shared/frontend"
import crypto from "crypto"
import path from "path"
import fs from "fs"
import sharp from "sharp"
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

async function optimizeToWebp(input: Buffer, width: number, quality: number) {
  return sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  applyCors(req, res)
  try {
    await ensureMultipartParsed(req as any, res as any)
  } catch (e: any) {
    const code = String(e?.code ?? "")
    const maxSizeMb = Math.max(5, Number(process.env.UPLOAD_MAX_SIZE_MB || 5))
    if (code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: `File too large. Max ${maxSizeMb}MB` })
      return
    }
    res.status(400).json({ message: String(e?.message ?? "Upload failed") })
    return
  }
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

  const files = (req as any).files as Express.Multer.File[] | undefined
  if (!files?.length) {
    res.status(400).json({ message: "No files uploaded" })
    return
  }

  const quality = Math.min(95, Math.max(1, Number(process.env.IMAGE_WEBP_QUALITY || 80)))
  const thumbWidth = Math.max(1, Number(process.env.IMAGE_THUMB_WIDTH || 800))
  const maxWidth = Math.max(1, Number(process.env.IMAGE_MAX_WIDTH || 1200))

  const cleaned: Array<{
    filename: string
    mimeType: string
    content: string
    access: "public"
  }> = []

  for (let idx = 0; idx < files.length; idx++) {
    const f: any = files[idx]
    const inputBuffer: Buffer | undefined =
      Buffer.isBuffer(f?.buffer) ? f.buffer : f?.path ? fs.readFileSync(String(f.path)) : undefined
    if (!inputBuffer) continue

    const name = `${crypto.randomUUID()}`
    const optimized = await optimizeToWebp(inputBuffer, maxWidth, quality)
    cleaned.push({
      filename: `${name}.webp`,
      mimeType: "image/webp",
      content: optimized.toString("base64"),
      access: "public",
    })

    if (idx === 0) {
      const thumb = await optimizeToWebp(inputBuffer, thumbWidth, quality)
      cleaned.push({
        filename: `${name}-thumb.webp`,
        mimeType: "image/webp",
        content: thumb.toString("base64"),
        access: "public",
      })
    }
  }

  if (!cleaned.length) {
    res.status(400).json({ message: "No files optimized" })
    return
  }

  const { uploadFilesWorkflow } = await import("@medusajs/core-flows")
  const { result: uploadResult } = await uploadFilesWorkflow(req.scope).run({
    input: { files: cleaned },
  })

  const urls: string[] = []
  let thumbnailUrl: string | null = null

  let resultIdx = 0
  for (let idx = 0; idx < files.length; idx++) {
    const mainUploaded = uploadResult[resultIdx++]
    if (mainUploaded) {
      urls.push(mainUploaded.url)
    }
    if (idx === 0) {
      const thumbUploaded = uploadResult[resultIdx++]
      if (thumbUploaded) {
        thumbnailUrl = thumbUploaded.url
      }
    }
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "thumbnail", "images.url"],
    filters: { id },
  })
  const existing = data?.[0]
  if (!existing) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  const existingUrls = Array.isArray(existing?.images)
    ? existing.images.map((i: any) => i?.url).filter(Boolean)
    : []

  const nextImages = [...existingUrls, ...urls].map((url) => ({ url }))

  const { updateProductsWorkflow } = await import("@medusajs/medusa/core-flows")
  const { result } = await updateProductsWorkflow(req.scope).run({
    input: {
      selector: { id },
      update: {
        images: nextImages,
        ...(!existing?.thumbnail && thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
      },
    },
  })

  const updated = Array.isArray(result) ? result[0] : result
  res.json({
    urls,
    thumbnail_url: thumbnailUrl,
    medusa: updated,
    frontend: updated ? mapMedusaProductToFrontend(updated) : null,
  })
}
