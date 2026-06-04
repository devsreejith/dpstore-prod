import crypto from "crypto"
import { hashPassword, verifyPassword } from "./helpers"

export { hashPassword, verifyPassword }

export type AdminRole = "SUPER_ADMIN" | "ADMIN"

export type AdminJwtPayload = {
  sub: string
  role: AdminRole
  iat: number
  exp: number
}

function base64UrlEncode(input: Buffer | string): string {
  const buff = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buff.toString("base64url")
}

function base64UrlDecodeToString(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8")
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not defined")
  }
  if (process.env.NODE_ENV === "production" && secret === "supersecret") {
    throw new Error("JWT_SECRET must be set to a secure value in production")
  }
  return secret
}

export function signAdminJwt(input: { sub: string; role: AdminRole }, opts?: { ttlSeconds?: number }): string {
  const secret = getJwtSecret()
  const ttlSeconds = Math.max(60, Number(opts?.ttlSeconds ?? 60 * 60 * 24))
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: "HS256", typ: "JWT" }
  const payload: AdminJwtPayload = {
    sub: input.sub,
    role: input.role,
    iat: now,
    exp: now + ttlSeconds,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const data = `${encodedHeader}.${encodedPayload}`
  const signature = crypto.createHmac("sha256", secret).update(data).digest()
  const encodedSignature = base64UrlEncode(signature)
  return `${data}.${encodedSignature}`
}

export function verifyAdminJwt(token: string): AdminJwtPayload | null {
  const secret = getJwtSecret()
  const parts = String(token || "").split(".")
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, encodedSig] = parts
  const data = `${encodedHeader}.${encodedPayload}`
  
  const expectedSigBuffer = crypto.createHmac("sha256", secret).update(data).digest()
  let actualSigBuffer: Buffer
  try {
    actualSigBuffer = Buffer.from(encodedSig, "base64url")
  } catch {
    return null
  }

  if (expectedSigBuffer.length !== actualSigBuffer.length) return null
  if (!crypto.timingSafeEqual(expectedSigBuffer, actualSigBuffer)) return null

  let payload: any
  try {
    payload = JSON.parse(base64UrlDecodeToString(encodedPayload))
  } catch {
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload?.exp !== "number" || payload.exp <= now) return null
  if (typeof payload?.sub !== "string" || !payload.sub) return null
  if (payload?.role !== "SUPER_ADMIN" && payload?.role !== "ADMIN") return null
  if (typeof payload?.iat !== "number") return null

  return payload as AdminJwtPayload
}

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  const raw = String(cookieHeader || "")
  if (!raw) return out
  const parts = raw.split(";")
  for (const part of parts) {
    const idx = part.indexOf("=")
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (!k) continue
    out[k] = decodeURIComponent(v)
  }
  return out
}
