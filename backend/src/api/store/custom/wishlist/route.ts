import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import pg from "pg";

async function ensureWishlistTable() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_wishlist (
        customer_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        product_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (customer_id, product_id)
      );
    `);
  } finally {
    await client.end();
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as any).auth_context?.actor_id;
  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  await ensureWishlistTable();

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    const queryRes = await client.query(
      "SELECT product_data FROM customer_wishlist WHERE customer_id = $1 ORDER BY created_at DESC",
      [actorId]
    );
    const items = queryRes.rows.map((row: any) => row.product_data);
    return res.status(200).json({ wishlist: items });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  } finally {
    await client.end();
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as any).auth_context?.actor_id;
  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  const { wishlist } = req.body as { wishlist: any[] };
  if (!Array.isArray(wishlist)) {
    return res.status(400).json({ message: "Wishlist array is required" });
  }

  await ensureWishlistTable();

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    
    // Clear old wishlist for this customer
    await client.query("DELETE FROM customer_wishlist WHERE customer_id = $1", [actorId]);
    
    // Filter out duplicates from the input list
    const uniqueItems: any[] = [];
    const seenIds = new Set<string>();
    if (wishlist && wishlist.length > 0) {
      for (const item of wishlist) {
        if (item && item.id) {
          const sId = String(item.id);
          if (!seenIds.has(sId)) {
            seenIds.add(sId);
            uniqueItems.push(item);
          }
        }
      }
    }

    // Insert new items
    if (uniqueItems.length > 0) {
      for (const item of uniqueItems) {
        await client.query(
          `INSERT INTO customer_wishlist (customer_id, product_id, product_data) 
           VALUES ($1, $2, $3)
           ON CONFLICT (customer_id, product_id) 
           DO UPDATE SET product_data = EXCLUDED.product_data`,
          [actorId, String(item.id), JSON.stringify(item)]
        );
      }
    }
    
    await client.query("COMMIT");
    return res.status(200).json({ success: true });
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch (rbErr) {
      console.error("Rollback failed:", rbErr);
    }
    console.error("Wishlist sync failed with error:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    await client.end();
  }
}
