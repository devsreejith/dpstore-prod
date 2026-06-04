import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function OPTIONS(_req: MedusaRequest, res: MedusaResponse) {
  res.status(204).end()
}

export async function POST(_req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Set-Cookie", "auth_token=; Path=/; Max-Age=0; SameSite=Lax")
  res.json({ ok: true })
}

