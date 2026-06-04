import { LoaderOptions } from "@medusajs/framework/types"
import crypto from "crypto"
import { ADMIN_USERS_MODULE } from ".."
import { hashPassword } from "../../../api/v1/_shared/helpers"

export default async function ensureSuperAdmin({ container }: LoaderOptions) {
  const email = String(process.env.ADMIN_SUPER_EMAIL || "").trim().toLowerCase()
  const password = String(process.env.ADMIN_SUPER_PASSWORD || "").trim()
  const name = String(process.env.ADMIN_SUPER_NAME || "Super Admin").trim()

  if (!email || !password) return

  const adminUsers: any = container.resolve(ADMIN_USERS_MODULE)

  const existing = await adminUsers.listAdminUsers({ email }, { take: 1 })
  if (existing?.length) return

  const salt = crypto.randomBytes(16).toString("hex")
  const password_hash = hashPassword(password, salt)

  await adminUsers.createAdminUser({
    name,
    email,
    password_hash,
    password_salt: salt,
    role: "SUPER_ADMIN",
    is_active: true,
  })
}
