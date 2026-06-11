import { defineMiddlewares } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { authenticate } from "@medusajs/medusa"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import express from "express"
import path from "path"
import fs from "fs"
import { parseCookieHeader, verifyAdminJwt } from "./v1/_shared/admin-auth"
import { getUploadDirAbsolute, ensureDir } from "./v1/_shared/helpers"

function createCors() {
  const raw = [process.env.STORE_CORS, process.env.ADMIN_CORS, process.env.AUTH_CORS]
    .filter((v) => typeof v === "string" && v.trim().length)
    .join(",")

  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (!entries.length && (process.env.NODE_ENV || "development") !== "production") {
    entries.push("http://localhost:3000", "http://127.0.0.1:3000")
  }

  const exact = new Set<string>()
  const regexes: RegExp[] = []
  const allowAny = entries.includes("*")

  for (const entry of entries) {
    if (entry === "*") continue
    const normalized = entry.replace(/\/$/, "")
    if (entry.startsWith("/") && entry.endsWith("/") && entry.length > 2) {
      try {
        regexes.push(new RegExp(entry.slice(1, -1)))
      } catch {
        exact.add(normalized)
      }
    } else {
      exact.add(normalized)
    }
  }

  const apply = (req: any, res: any) => {
    const originRaw = req.headers?.origin as string | undefined
    const origin = originRaw ? String(originRaw).replace(/\/$/, "") : undefined
    const allowed =
      !!origin && (allowAny || exact.has(origin) || regexes.some((re) => re.test(origin)))

    if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", originRaw)
      res.setHeader("Vary", "Origin")
      res.setHeader("Access-Control-Allow-Credentials", "true")
      res.setHeader(
        "Access-Control-Allow-Headers",
        req.headers["access-control-request-headers"] ||
          "Content-Type, Authorization"
      )
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
      )
    }

    return allowed
  }

  const middleware = (req: any, res: any, next: any) => {
    const origin = req.headers?.origin
    const allowed = apply(req, res)
    console.log(`[CORS DEBUG] Path: ${req.path || req.originalUrl}, Method: ${req.method}, Origin: ${origin}, Allowed: ${allowed}`)
    if (req.method === "OPTIONS") {
      res.statusCode = 204
      res.end()
      return
    }

    next()
  }

  return { middleware, apply }
}

const uploadDirAbs = getUploadDirAbsolute()
ensureDir(uploadDirAbs)

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = String(req.path || req.originalUrl || "")
    return p.includes("/admin/") || p.includes("/admin")
  }
})

const adminLimiter = rateLimit({
  windowMs: 60_000,
  limit: 2000,
  standardHeaders: true,
  legacyHeaders: false,
})

const cors = createCors()

async function requireAdminAuth(req: any, res: any, next: any) {
  const pathName = String(req?.path || req?.originalUrl || "")
  if (pathName.includes("/admin/auth/login")) return next()

  const authHeader = String(req.headers?.authorization || "")
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  const cookies = parseCookieHeader(req.headers?.cookie)
  const token = bearer || cookies.auth_token || ""

  const payload = token ? verifyAdminJwt(token) : null
  if (payload) {
    req.admin = payload
    return next()
  }

  const actorId = req.auth_context?.actor_id
  const actorType = req.auth_context?.actor_type
  if (actorId && (actorType === "admin" || actorType === "user")) {
    // 1. First look up custom admin_users module for user and role
    try {
      const adminUsersModule: any = req.scope.resolve("admin_users")
      const [adminUser] = await adminUsersModule.listAdminUsers({ id: actorId }, { take: 1 })
      if (adminUser) {
        req.admin = {
          sub: actorId,
          role: adminUser.role || "ADMIN",
        }
        return next()
      }
    } catch {}

    // 2. Fallback: Lookup standard core Medusa user
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data: users } = await query.graph({
        entity: "user",
        fields: ["id", "email"],
        filters: { id: actorId },
      })
      const user = users?.[0]
      if (user) {
        // Automatically sync core admin user to our custom table
        const adminUsersModule: any = req.scope.resolve("admin_users")
        const created = await adminUsersModule.createAdminUsers({
          id: user.id,
          name: user.email.split("@")[0] || "Admin",
          email: user.email,
          password_hash: "EXTERNAL_MEDUSA_AUTH",
          password_salt: "EXTERNAL_MEDUSA_AUTH",
          role: "ADMIN",
          is_active: true,
        })
        const finalUser = Array.isArray(created) ? created[0] : created
        req.admin = {
          sub: finalUser.id,
          role: finalUser.role || "ADMIN",
        }
        return next()
      }
    } catch {}
  }

  res.status(401).json({ message: "Unauthorized" })
}

function requireSuperAdmin(req: any, res: any, next: any) {
  if (req?.admin?.role !== "SUPER_ADMIN") {
    res.status(403).json({ message: "Forbidden" })
    return
  }
  next()
}

function requireCustomerAuth(req: any, res: any, next: any) {
  const method = String(req?.method || "").toUpperCase()
  if (method === "OPTIONS") return next()

  const pathName = String(req?.path || req?.originalUrl || "")

  const isCheckoutCartUpdate = /^\/?store\/carts\/[^/]+\/?$/.test(pathName) && method === "POST"
  const isShippingMethod = /^\/?store\/carts\/[^/]+\/shipping-methods\/?$/.test(pathName) && method === "POST"
  const isCompleteCart = /^\/?store\/carts\/[^/]+\/complete\/?$/.test(pathName) && method === "POST"
  const isPaymentCollection = /^\/?store\/payment-collections/.test(pathName) && method === "POST"
  const isCancelOrder = /^\/?store\/orders\/[^/]+\/cancel\/?$/.test(pathName) && method === "POST"

  const isCheckoutAction = isCheckoutCartUpdate || isShippingMethod || isCompleteCart || isPaymentCollection || isCancelOrder

  if (!isCheckoutAction) {
    return next()
  }

  const actorId = req.auth_context?.actor_id
  if (actorId && String(actorId).startsWith("cus_")) {
    return next()
  }

  res.status(401).json({ message: "Please login or create an account to continue with checkout." })
}

async function enforceSingleProductCategory(req: any, res: any, next: any) {
  const method = String(req?.method || "").toUpperCase()
  if (method !== "POST" && method !== "PUT" && method !== "PATCH") return next()

  const body = req?.body
  if (!body || typeof body !== "object") return next()

  const pathName = String(req?.path || "")
  const isCreate = method === "POST" && /^\/admin\/products\/?$/.test(pathName)
  const hasCategoriesField = Object.prototype.hasOwnProperty.call(body, "categories")
  const categories = Array.isArray((body as any).categories) ? (body as any).categories.filter(Boolean) : []

  if (isCreate) {
    if (categories.length !== 1) {
      res.status(400).json({ message: "Select exactly one category." })
      return
    }
  } else if (hasCategoriesField) {
    if (categories.length > 1) {
      res.status(400).json({ message: "Only one category is allowed per product." })
      return
    }
  }

  const isPublishing = String((body as any).status || "").toLowerCase() === "published"
  if (!isPublishing) return next()

  if (categories.length === 1) return next()

  const match = String(req?.path || "").match(/^\/admin\/products\/([^/]+)/)
  const productId = match?.[1]
  if (productId && req?.scope?.resolve) {
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "categories.id"],
        filters: { id: productId },
      })
      const existing = data?.[0]
      const existingCategories = Array.isArray(existing?.categories) ? existing.categories : []
      if (existingCategories.length === 1) return next()
    } catch {}
  }

  res.status(400).json({
    message: "Exactly one category is required before publishing a product.",
  })
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store",
      middlewares: [requireCustomerAuth],
    },
    {
      matcher: "/store/*",
      middlewares: [requireCustomerAuth],
    },
    {
      matcher: "/admin/products",
      middlewares: [enforceSingleProductCategory],
    },
    {
      matcher: "/admin/products/*",
      middlewares: [enforceSingleProductCategory],
    },
    {
      matcher: "/uploads/*",
      middlewares: [express.static(uploadDirAbs)],
    },
    {
      matcher: "/api/v1/uploads",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/v1/uploads",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/api/v1/admin/products/:id/images",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/v1/admin/products/:id/images",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/api/v1/admin/categories/:id/image",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/v1/admin/categories/:id/image",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/api/v1/admin/admin-users",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        requireSuperAdmin,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/api/v1/admin/admin-users/*",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        requireSuperAdmin,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/v1/admin/admin-users",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        requireSuperAdmin,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/v1/admin/admin-users/*",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        requireSuperAdmin,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/api/v1/admin/*",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/v1/admin/*",
      middlewares: [
        cors.middleware,
        authenticate("user", ["session", "bearer", "api-key"]),
        requireAdminAuth,
        helmet(),
        adminLimiter,
      ],
    },
    {
      matcher: "/api/v1/*",
      middlewares: [cors.middleware, helmet(), limiter],
    },
    {
      matcher: "/v1/*",
      middlewares: [cors.middleware, helmet(), limiter],
    },
    {
      matcher: "/categories.json",
      middlewares: [cors.middleware, helmet(), limiter],
    },
    {
      matcher: "/featured_products.json",
      middlewares: [cors.middleware, helmet(), limiter],
    },
    {
      matcher: "/products.json",
      middlewares: [cors.middleware, helmet(), limiter],
    },
    {
      matcher: "/products_2.json",
      middlewares: [cors.middleware, helmet(), limiter],
    },
    {
      matcher: "/related_products.json",
      middlewares: [cors.middleware, helmet(), limiter],
    },
    {
      matcher: "/search.json",
      middlewares: [cors.middleware, helmet(), limiter],
    },
    {
      matcher: "/v1/openapi.json",
      middlewares: [cors.middleware, helmet(), limiter],
    },
    {
      matcher: "/api/v1/openapi.json",
      middlewares: [cors.middleware, helmet(), limiter],
    },
  ],
})
