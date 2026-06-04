import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json({
    openapi: "3.0.3",
    info: {
      title: "Dubai Police Ecommerce API",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:9000" }],
    paths: {
      "/api/v1/products": {
        get: {
          summary: "List products",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            { name: "min_price", in: "query", schema: { type: "number", minimum: 0 } },
            { name: "max_price", in: "query", schema: { type: "number", minimum: 0 } },
            { name: "in_stock", in: "query", schema: { type: "boolean" } },
            {
              name: "sort",
              in: "query",
              schema: {
                type: "string",
                enum: ["newest", "oldest", "price_asc", "price_desc", "name_asc", "name_desc"],
              },
            },
            { name: "featured", in: "query", schema: { type: "boolean" } },
            { name: "related_to", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/products/{slug}": {
        get: {
          summary: "Get product details by slug",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" }, "404": { description: "Not Found" } },
        },
      },
      "/api/v1/categories": {
        get: {
          summary: "List categories",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/categories/{slug}": {
        get: {
          summary: "Get category details by slug",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" }, "404": { description: "Not Found" } },
        },
      },
      "/api/v1/uploads": {
        post: {
          summary: "Upload files (local dev)",
          requestBody: { required: true },
          responses: { "200": { description: "OK" }, "400": { description: "Bad Request" } },
        },
      },
      "/api/v1/admin/products": {
        get: { summary: "List products (admin)", responses: { "200": { description: "OK" } } },
        post: { summary: "Create product (admin)", responses: { "201": { description: "Created" } } },
      },
      "/api/v1/admin/products/{id}": {
        get: { summary: "Get product (admin)", responses: { "200": { description: "OK" } } },
        patch: { summary: "Update product (admin)", responses: { "200": { description: "OK" } } },
        delete: { summary: "Delete product (admin)", responses: { "204": { description: "No Content" } } },
      },
      "/api/v1/admin/products/{id}/images": {
        post: { summary: "Upload product images (admin)", responses: { "200": { description: "OK" } } },
      },
      "/api/v1/admin/categories": {
        get: { summary: "List categories (admin)", responses: { "200": { description: "OK" } } },
        post: { summary: "Create category (admin)", responses: { "201": { description: "Created" } } },
      },
      "/api/v1/admin/categories/{id}": {
        get: { summary: "Get category (admin)", responses: { "200": { description: "OK" } } },
        patch: { summary: "Update category (admin)", responses: { "200": { description: "OK" } } },
        delete: { summary: "Delete category (admin)", responses: { "204": { description: "No Content" } } },
      },
      "/api/v1/admin/categories/{id}/image": {
        post: { summary: "Upload category image (admin)", responses: { "200": { description: "OK" } } },
      },
    },
  })
}

