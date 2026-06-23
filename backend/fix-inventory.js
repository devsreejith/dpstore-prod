const { Client } = require('pg');

async function fixInventory() {
  const client = new Client('postgresql://medusa:medusa@localhost:5433/dp_store');
  await client.connect();

  try {
    const query = `
      UPDATE inventory_level il
      SET 
        reserved_quantity = subquery.total_reserved,
        raw_reserved_quantity = jsonb_build_object('value', CAST(subquery.total_reserved AS TEXT), 'precision', 20)
      FROM (
        SELECT 
          il.id AS inventory_level_id,
          COALESCE(SUM(ri.quantity), 0) AS total_reserved
        FROM inventory_level il
        LEFT JOIN reservation_item ri 
          ON il.inventory_item_id = ri.inventory_item_id 
          AND il.location_id = ri.location_id 
          AND ri.deleted_at IS NULL
        GROUP BY il.id
      ) AS subquery
      WHERE il.id = subquery.inventory_level_id
        AND il.reserved_quantity != subquery.total_reserved;
    `;
    const res = await client.query(query);
    console.log('Rows updated:', res.rowCount);
  } catch (error) {
    console.error('Error updating inventory levels:', error);
  } finally {
    await client.end();
  }
}

fixInventory();
