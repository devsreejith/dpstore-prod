import { MedusaService } from "@medusajs/framework/utils"
import AdminUser from "./models/admin-user"

class AdminUsersModuleService extends MedusaService({
  AdminUser,
}) {}

export default AdminUsersModuleService

