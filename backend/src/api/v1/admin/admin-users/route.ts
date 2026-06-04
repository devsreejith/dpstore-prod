import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"
import { ADMIN_USERS_MODULE } from "../../../../modules/admin-users"
import { hashPassword } from "../../_shared/admin-auth"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = typeof req.query?.q === "string" ? req.query.q.trim() : undefined
  const limit = Math.min(200, Math.max(1, Number(req.query?.limit ?? 50)))
  const offset = Math.max(0, Number(req.query?.offset ?? 0))

  const adminUsers: any = req.scope.resolve(ADMIN_USERS_MODULE)
  const filters: any = {}
  if (q) filters.q = q

  const [data, count] = await adminUsers.listAndCountAdminUsers(filters, { take: limit, skip: offset })
  res.json({
    data: (data ?? []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      created_at: u.created_at,
      updated_at: u.updated_at,
    })),
    count,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const name = String((req.body as any)?.name ?? "").trim()
  const email = String((req.body as any)?.email ?? "")
    .trim()
    .toLowerCase()
  const password = String((req.body as any)?.password ?? "").trim()
  const role = String((req.body as any)?.role ?? "ADMIN").trim()
  const is_active = (req.body as any)?.is_active !== false

  if (!name || !email || !password) {
    res.status(400).json({ message: "name, email, password are required" })
    return
  }

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    res.status(400).json({ message: "Invalid role" })
    return
  }

  const salt = crypto.randomBytes(16).toString("hex")
  const password_hash = hashPassword(password, salt)

  const adminUsers: any = req.scope.resolve(ADMIN_USERS_MODULE)
  const created = await adminUsers.createAdminUsers({
    name,
    email,
    password_hash,
    password_salt: salt,
    role,
    is_active,
  })

  const user = Array.isArray(created) ? created[0] : created
  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  })
}
