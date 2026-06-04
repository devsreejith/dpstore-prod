import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_USERS_MODULE } from "../../../../../modules/admin-users"

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

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const admin = (req as any).admin
  const adminId = String(admin?.sub ?? "")
  if (!adminId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const adminUsers: any = req.scope.resolve(ADMIN_USERS_MODULE)
  const user = await adminUsers.retrieveAdminUser(adminId)
  if (!user || user?.is_active !== true) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const role = user.role as "SUPER_ADMIN" | "ADMIN"
  res.json({
    admin: { id: user.id, name: user.name, email: user.email, role: user.role, is_active: user.is_active },
    permissions: buildPermissions(role),
  })
}

