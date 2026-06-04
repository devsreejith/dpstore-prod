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
  }

  res.json({ payment_collection: paymentCollection, authorization: payment })
}
