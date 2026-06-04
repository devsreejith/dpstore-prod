import { model } from "@medusajs/framework/utils"

const AdminUser = model.define("admin_user", {
  id: model.id().primaryKey(),
  name: model.text(),
  email: model.text().unique().searchable(),
  password_hash: model.text(),
  password_salt: model.text(),
  role: model.enum(["SUPER_ADMIN", "ADMIN"]).default("ADMIN"),
  is_active: model.boolean().default(true),
})

export default AdminUser

