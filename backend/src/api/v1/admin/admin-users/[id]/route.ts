import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"
import { ADMIN_USERS_MODULE } from "../../../../../modules/admin-users"
import { hashPassword } from "../../../_shared/admin-auth"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

  const adminUsers: any = req.scope.resolve(ADMIN_USERS_MODULE)
  const u = await adminUsers.retrieveAdminUser(id)
  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

  const body: any = req.body ?? {}
  const next: any = {}

  if (body.name !== undefined) next.name = String(body.name ?? "").trim()
  if (body.email !== undefined) next.email = String(body.email ?? "").trim().toLowerCase()
  if (body.role !== undefined) {
    const role = String(body.role ?? "").trim()
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      res.status(400).json({ message: "Invalid role" })
      return
    }
    next.role = role
  }
  if (body.is_active !== undefined) next.is_active = body.is_active === true
  if (body.password !== undefined) {
    const password = String(body.password ?? "").trim()
    if (!password) {
      res.status(400).json({ message: "Invalid password" })
      return
    }
    const salt = crypto.randomBytes(16).toString("hex")
    next.password_salt = salt
    next.password_hash = hashPassword(password, salt)
  }

  const adminUsers: any = req.scope.resolve(ADMIN_USERS_MODULE)
  const updated = await adminUsers.updateAdminUsers(id, next)
  const u = Array.isArray(updated) ? updated[0] : updated
  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ message: "Missing id" })
    return
  }

  const adminUsers: any = req.scope.resolve(ADMIN_USERS_MODULE)
  await adminUsers.deleteAdminUsers(id)
  res.status(204).end()
}
