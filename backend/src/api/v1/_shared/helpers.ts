import crypto from "crypto"
import fs from "fs"
import path from "path"
import multer from "multer"

export function resolveBackendProjectRoot(): string {
  const start = process.cwd()

  const matchesBackendPkg = (dir: string) => {
    try {
      const pkgPath = path.join(dir, "package.json")
      if (!fs.existsSync(pkgPath)) return false
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
      return pkg?.name === "@dtc/backend"
    } catch {
      return false
    }
  }

  let dir = start
  for (let i = 0; i < 50; i++) {
    if (matchesBackendPkg(dir)) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  const candidates = [
    path.join(start, "backend"),
    path.join(start, "apps", "backend"),
    path.join(start, "backend", "apps", "backend"),
  ]
  for (const candidate of candidates) {
    if (matchesBackendPkg(candidate)) return candidate
  }

  return start
}

export function getUploadDirAbsolute(): string {
  const uploadDir = process.env.UPLOAD_DIR || "public/uploads"
  const projectRoot = resolveBackendProjectRoot()
  return path.isAbsolute(uploadDir) ? uploadDir : path.join(projectRoot, uploadDir)
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function hashPassword(password: string, salt: string): string {
  const derived = crypto.scryptSync(password, salt, 64)
  return derived.toString("hex")
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = hashPassword(password, salt)
  const a = Buffer.from(actual, "hex")
  const b = Buffer.from(expectedHash, "hex")
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function ensureMultipartParsed(
  req: any,
  res: any,
  fileLimit = 10,
  maxSizeMb = 5
): Promise<void> {
  const alreadyParsed = Array.isArray(req.files) || !!req.file
  if (alreadyParsed) return

  const allowedMime = new Set(
    (process.env.UPLOAD_ALLOWED_MIME || "image/jpeg,image/png,image/webp,image/gif")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  )

  const maxSizeBytes = Math.max(1, maxSizeMb * 1024 * 1024)

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeBytes, files: fileLimit },
    fileFilter: (_req, file, cb) => {
      const mime = String(file.mimetype || "").toLowerCase()
      const isJpgAlias = mime === "image/jpg" && allowedMime.has("image/jpeg")
      if (!allowedMime.has(mime) && !isJpgAlias) {
        cb(new Error("Unsupported file type"))
        return
      }
      cb(null, true)
    },
  })

  await new Promise<void>((resolve, reject) => {
    upload.any()(req, res, (err: any) => {
      if (err) reject(err)
      else resolve()
    })
  })
}
