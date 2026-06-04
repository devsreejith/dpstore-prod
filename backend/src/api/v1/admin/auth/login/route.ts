import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_USERS_MODULE } from "../../../../../modules/admin-users"
import { signAdminJwt, verifyPassword } from "../../../_shared/admin-auth"

function buildPermissions(role: "SUPER_ADMIN" | "ADMIN") {
  if (role === "SUPER_ADMIN") {
    return {
      manage_admin_users: true,
      manage_products: true,
      manage_categories: true,
      manage_collections: true,
      manage_inventory: true,
      manage_orders: true,
      manage_customers: true,
      manage_shipping: true,
      manage_payment_settings: true,
      manage_website_settings: true,
      access_analytics: true,
    }
  }

  return {
    manage_admin_users: false,
    manage_products: true,
    manage_categories: true,
    manage_collections: false,
    manage_inventory: true,
    manage_orders: true,
    manage_customers: true,
    manage_shipping: true,
    manage_payment_settings: false,
    manage_website_settings: false,
    access_analytics: false,
  }
}

export async function OPTIONS(_req: MedusaRequest, res: MedusaResponse) {
  res.status(204).end()
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const email = String((req.body as any)?.email ?? "")
    .trim()
    .toLowerCase()
  const password = String((req.body as any)?.password ?? "").trim()

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" })
    return
  }

  const adminUsers: any = req.scope.resolve(ADMIN_USERS_MODULE)
  const users = await adminUsers.listAdminUsers({ email }, { take: 1 })
  const user = users?.[0]

  if (!user || user?.is_active !== true) {
    res.status(401).json({ message: "Invalid credentials" })
    return
  }

  const ok = verifyPassword(password, String(user.password_salt), String(user.password_hash))
  if (!ok) {
    res.status(401).json({ message: "Invalid credentials" })
    return
  }

  const role = user.role as "SUPER_ADMIN" | "ADMIN"
  const token = signAdminJwt({ sub: String(user.id), role }, { ttlSeconds: 60 * 60 * 24 * 7 })

  const httpOnly = String(process.env.ADMIN_TOKEN_HTTPONLY || "").toLowerCase() === "true"
  res.setHeader(
    "Set-Cookie",
    `auth_token=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${
      httpOnly ? "; HttpOnly" : ""
    }`
  )

  res.json({
    token: httpOnly ? undefined : token,
    admin: { id: user.id, name: user.name, email: user.email, role: user.role, is_active: user.is_active },
    permissions: buildPermissions(role),
  })
}
