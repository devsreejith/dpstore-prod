require('dotenv').config();
const axios = require('axios');

async function main() {
  const apiKey = process.env.NGENIUS_API_KEY;
  const outletId = process.env.NGENIUS_OUTLET_ID;
  const medusaUrl = process.env.MEDUSA_BACKEND_URL;

  if (!apiKey || !outletId) {
    console.error("Error: NGENIUS_API_KEY or NGENIUS_OUTLET_ID is not configured in .env");
    process.exit(1);
  }

  console.log("Using API Key:", apiKey.substring(0, 10) + "...");
  console.log("Using Outlet ID:", outletId);

  try {
    // 1. Get Access Token
    console.log("Fetching N-Genius Access Token...");
    const authRes = await axios.post("https://api-gateway.sandbox.ngenius-payments.com/identity/auth/access-token", {}, {
      headers: {
        "Authorization": `Basic ${apiKey}`,
        "Content-Type": "application/vnd.ni-identity.v1+json",
        "Accept": "application/vnd.ni-identity.v1+json",
      }
    });
    
    const token = authRes.data.access_token;
    console.log("Access Token retrieved successfully.");

    // 2. Create Order
    console.log("Creating Test Order (1.00 AED)...");
    const orderRef = "test-ref-" + Date.now();
    const orderRes = await axios.post(
      `https://api-gateway.sandbox.ngenius-payments.com/transactions/outlets/${outletId}/orders`,
      {
        action: "SALE",
        amount: {
          currencyCode: "AED",
          value: 100
        },
        merchantOrderReference: orderRef
      },
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/vnd.ni-payment.v2+json",
          "Accept": "application/vnd.ni-payment.v2+json",
        }
      }
    );

    const reference = orderRes.data.reference;
    console.log("\n--- Create Order Response ---");
    console.log(JSON.stringify(orderRes.data, null, 2));

    // 3. Immediately Query Status
    console.log(`\nQuerying Status for Reference: ${reference}...`);
    const statusRes = await axios.get(
      `https://api-gateway.sandbox.ngenius-payments.com/transactions/outlets/${outletId}/orders/${reference}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.ni-payment.v2+json",
        }
      }
    );

    console.log("\n--- Get Order Status Response ---");
    console.log(JSON.stringify(statusRes.data, null, 2));

  } catch (err) {
    console.error("Error occurred:", err.response ? err.response.data : err.message);
  }
}

main();
