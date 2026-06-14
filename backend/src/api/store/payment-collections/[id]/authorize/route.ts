import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [paymentCollection] } = await query.graph({
    entity: "payment_collection",
    fields: ["id", "amount", "payment_sessions.*"],
    filters: { id },
  })

  if (!paymentCollection) {
    res.status(404).json({ message: "Payment collection not found" })
    return
  }

  const session = paymentCollection.payment_sessions?.[0]
  if (!session) {
    res.status(400).json({ message: "No payment session found" })
    return
  }

  const paymentModuleService = req.scope.resolve("payment")
  const payment = await paymentModuleService.authorizePaymentSession(session.id, {})

  if (payment && payment.id) {
    try {
      await paymentModuleService.capturePayment({
        payment_id: payment.id,
        amount: payment.amount ?? paymentCollection.amount,
      });
    } catch (captureErr) {
      console.error("Capture error:", captureErr);
    }

    try {
      const pg = await import("pg");
      const client = new pg.default.Client({
        connectionString: process.env.DATABASE_URL,
      });
      await client.connect();
      try {
        const orderRes = await client.query(
          "SELECT order_id FROM order_payment_collection WHERE payment_collection_id = $1 AND deleted_at IS NULL",
          [id]
        );
        if (orderRes.rows.length > 0) {
          const orderId = orderRes.rows[0].order_id;
          const orderCheck = await client.query(
            "SELECT status, canceled_at FROM \"order\" WHERE id = $1",
            [orderId]
          );
          if (orderCheck.rows.length > 0 && orderCheck.rows[0].status === 'canceled') {
            console.log(`[Authorize Endpoint] Restoring previously canceled order ${orderId} because payment is now successful.`);
            await client.query(
              "UPDATE \"order\" SET status = 'pending', canceled_at = NULL WHERE id = $1",
              [orderId]
            );
          }
        }
      } finally {
        await client.end();
      }
    } catch (err: any) {
      console.error("Failed to restore order in authorize endpoint:", err.message);
    }
  }

  res.json({ payment_collection: paymentCollection, authorization: payment })
}
