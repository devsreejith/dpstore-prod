
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import crypto from "crypto"
import sharp from "sharp"

type UploadedFile = {
  originalname?: string
  mimetype?: string
  buffer?: Buffer
}

function safeString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v)
}

function isOptimizableImageMime(mime: string) {
  if (!mime.startsWith("image/")) return false
  if (mime === "image/svg+xml") return false
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp" || mime === "image/jpg"
}

async function optimizeToWebp(input: Buffer, width: number, quality: number) {
  return sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const input = (req as any).files as UploadedFile[] | undefined
  if (!input?.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "No files were uploaded")
  }

  const quality = Math.min(95, Math.max(1, Number(process.env.IMAGE_WEBP_QUALITY || 80)))
  const maxWidth = Math.max(1, Number(process.env.IMAGE_MAX_WIDTH || 1200))

  const files = await Promise.all(
    input.map(async (f) => {
      const mime = safeString(f?.mimetype).toLowerCase().trim()
      const buffer = Buffer.isBuffer(f?.buffer) ? (f.buffer as Buffer) : null
      if (!buffer) {
        return null
      }

      if (!isOptimizableImageMime(mime)) {
        return {
          filename: safeString(f?.originalname) || `${crypto.randomUUID()}`,
          mimeType: mime || "application/octet-stream",
          content: buffer.toString("base64"),
          access: "public" as const,
        }
      }

      const optimized = await optimizeToWebp(buffer, maxWidth, quality)
      return {
        filename: `${crypto.randomUUID()}.webp`,
        mimeType: "image/webp",
        content: optimized.toString("base64"),
        access: "public" as const,
      }
    })
  )

  const cleaned = files.filter(Boolean) as Array<{
    filename: string
    mimeType: string
    content: string
    access: "public"
  }>

  if (!cleaned.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "No files were uploaded")
  }

  const { uploadFilesWorkflow } = await import("@medusajs/core-flows")
  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: { files: cleaned },
  })

  res.status(200).json({ files: result })
}

