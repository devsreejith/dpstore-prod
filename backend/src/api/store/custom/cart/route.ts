import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import pg from "pg";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as any).auth_context?.actor_id;
  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    const queryRes = await client.query(
      "SELECT id FROM cart WHERE customer_id = $1 AND completed_at IS NULL ORDER BY created_at DESC LIMIT 1",
      [actorId]
    );
    const cartId = queryRes.rows[0]?.id || null;
    return res.status(200).json({ cart_id: cartId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  } finally {
    await client.end();
  }
}
