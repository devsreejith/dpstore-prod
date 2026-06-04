import { Module } from "@medusajs/framework/utils"
import AdminUsersModuleService from "./service"

export const ADMIN_USERS_MODULE = "admin_users"

export default Module(ADMIN_USERS_MODULE, {
  service: AdminUsersModuleService,
})

