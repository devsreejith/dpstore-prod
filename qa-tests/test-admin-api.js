const axios = require('axios');
require('dotenv').config();

async function main() {
  const baseUrl = process.env.MEDUSA_BACKEND_URL;
  const email = process.env.MEDUSA_ADMIN_EMAIL;
  const password = process.env.MEDUSA_ADMIN_PASSWORD;

  console.log("Testing Admin API Authentication...");
  console.log("Base URL:", baseUrl);
  console.log("Admin Email:", email);

  try {
    const authRes = await axios.post(`${baseUrl}/admin/auth/user/emailpass`, {
      email,
      password
    });
    console.log("Auth Success! Status:", authRes.status);
    console.log("Response Data:", JSON.stringify(authRes.data, null, 2));
  } catch (err) {
    console.error("Auth Failed:", err.response ? err.response.data : err.message);
  }
}

main();
