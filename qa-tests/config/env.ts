import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environmental variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

export const env = {
  medusa: {
    baseUrl: process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000',
    publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY || '',
    adminEmail: process.env.MEDUSA_ADMIN_EMAIL || 'admin@medusajs.com',
    adminPassword: process.env.MEDUSA_ADMIN_PASSWORD || 'supersecretpassword',
    regionId: process.env.MEDUSA_REGION_ID || '',
    salesChannelId: process.env.MEDUSA_SALES_CHANNEL_ID || '',
  },
  ngenius: {
    apiKey: process.env.NGENIUS_API_KEY || '',
    outletId: process.env.NGENIUS_OUTLET_ID || '',
    webhookSecretKey: process.env.NGENIUS_WEBHOOK_HEADER_KEY || 'DP-NGenius-Secret',
    webhookSecretValue: process.env.NGENIUS_WEBHOOK_HEADER_VALUE || 'aljaber_dpstore_secret_2026',
    webhookUrl: process.env.NGENIUS_WEBHOOK_URL || 'http://localhost:9000/webhooks/ngenius',
  },
  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://medusa:medusa@localhost:5433/dp_store',
  },
};
