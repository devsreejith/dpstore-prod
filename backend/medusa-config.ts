import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || "development", __dirname)

const jwtSecret = process.env.JWT_SECRET || "supersecret"
const cookieSecret = process.env.COOKIE_SECRET || "supersecret"

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "supersecret") {
    throw new Error("JWT_SECRET environment variable must be set to a secure, unique value in production mode!")
  }
  if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === "supersecret") {
    throw new Error("COOKIE_SECRET environment variable must be set to a secure, unique value in production mode!")
  }
}

const adminMaxUploadMb = Math.max(
  5,
  Number(process.env.ADMIN_MAX_UPLOAD_FILE_SIZE_MB || process.env.UPLOAD_MAX_SIZE_MB || 5)
)

const modules = [
  {
    resolve: "@medusajs/medusa/caching",
    options: {
      providers: [
        {
          id: "caching-redis",
          resolve: "@medusajs/caching-redis",
          options: {
            redisUrl: process.env.REDIS_URL,
          },
        },
      ],
    },
  },
  {
    resolve: "./src/modules/admin-users",
  },
  {
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [
        {
          resolve: "@medusajs/file-s3",
          id: "s3",
          options: {
            file_url: process.env.R2_FILE_URL,
            access_key_id: process.env.R2_ACCESS_KEY_ID,
            secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
            region: "auto",
            bucket: process.env.R2_BUCKET,
            endpoint: process.env.R2_ENDPOINT,
            prefix: process.env.R2_PREFIX || "products/",
          },
        },
      ],
    },
  },
]

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret,
      cookieSecret,
    }
  },
  admin: {
    maxUploadFileSize: adminMaxUploadMb * 1024 * 1024,
    vite: (config: any) => {
      const bytes = adminMaxUploadMb * 1024 * 1024
      return {
        define: {
          ...(config?.define ?? {}),
          __MAX_UPLOAD_FILE_SIZE__: JSON.stringify(bytes),
        },
      }
    },
  },
  modules,
  featureFlags: {
    caching: true,
  },
})
