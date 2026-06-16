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

  const sessions = paymentCollection.payment_sessions || []
  sessions.sort((a: any, b: any) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
    return dateB - dateA
  })
  const session = sessions[0]
  if (!session) {
    res.status(400).json({ message: "No payment session found" })
    return
  }

  const paymentModuleService = req.scope.resolve("payment")
  
  let payment: any;
  let authorizationError = false;
  try {
    payment = await paymentModuleService.authorizePaymentSession(session.id, {})
  } catch (err: any) {
    console.error("[Authorize Endpoint] Authorization error:", err.message);
    authorizationError = true;
  }

  let captureSuccessful = false;
  let paymentStatus = "pending";
  let overallState = "";

  if (payment && payment.id && !authorizationError) {
    try {
      await paymentModuleService.capturePayment({
        payment_id: payment.id,
        amount: payment.amount ?? paymentCollection.amount,
      });
      captureSuccessful = true;
      paymentStatus = "captured";
    } catch (captureErr: any) {
      console.error("[Authorize Endpoint] Capture error:", captureErr.message);
    }
  }

  // Verify the actual transaction status with N-Genius if capture was not successful
  if (!captureSuccessful) {
    try {
      const reference = String((session.data as any)?.reference || (session.data as any)?.id || "");
      if (reference) {
        const config = {
          apiKey: process.env.NGENIUS_API_KEY,
          merchantId: process.env.NGENIUS_MERCHANT_ID,
          outletId: process.env.NGENIUS_OUTLET_ID,
          tokenUrl: process.env.NGENIUS_TOKEN_URL || "https://api-gateway.sandbox.ngenius-payments.com/identity/auth/access-token",
          transactionUrl: process.env.NGENIUS_TRANSACTION_URL || "https://api-gateway.sandbox.ngenius-payments.com/transactions/outlets/{OUTLET_ID}/orders",
          successUrl: process.env.NGENIUS_SUCCESS_URL || "http://localhost:8000/order",
          failureUrl: process.env.NGENIUS_FAILURE_URL || "http://localhost:8000/order",
          cancelUrl: process.env.NGENIUS_CANCEL_URL || "http://localhost:8000/order",
        };
        const logger = req.scope.resolve("logger") || console;
        const { NGeniusClient } = await import("../../../../../modules/ngenius-payment/ngenius-client.js");
        const ngeniusClient = new NGeniusClient(config as any, logger);

        const isTest = (session.data as any)?.is_test === true || (session.data as any)?.is_test === "true" || reference.startsWith("mock-");
        let statusResponse: any;
        if (isTest) {
          statusResponse = {
            status: session.data?.status || "STARTED",
            _embedded: session.data?._embedded,
          };
        } else {
          statusResponse = await ngeniusClient.getOrderStatus(reference);
        }

        const payments = statusResponse._embedded?.payment;
        overallState = String(statusResponse.status || statusResponse.state || "").toUpperCase();
        if (Array.isArray(payments) && payments.length > 0) {
          // Access the latest chronological payment attempt at the end of the array
          const latestPayment = payments[payments.length - 1];
          const state = latestPayment.status || latestPayment.state;
          if (state) {
            overallState = String(state).toUpperCase();
          }
        }

        if (["CAPTURED", "PURCHASED", "SUCCESS"].includes(overallState)) {
          paymentStatus = "captured";
          captureSuccessful = true;
        } else if (["AUTHORIZED", "AUTH"].includes(overallState)) {
          paymentStatus = "authorized";
          captureSuccessful = true;
        } else if (["FAILED", "DECLINED", "REJECTED"].includes(overallState)) {
          paymentStatus = "error";
        } else if (["CANCELLED", "CANCELED"].includes(overallState)) {
          paymentStatus = "canceled";
        }
      }
    } catch (statusErr: any) {
      console.error("[Authorize Endpoint] Failed to check status from N-Genius:", statusErr.message);
    }
  }
    if (captureSuccessful) {
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
        console.error("[Authorize Endpoint] Failed to restore order in authorize endpoint:", err.message);
      }
    } else {
      // Payment did not succeed. If it's a permanent error, cancel the order and delete reservations
      if (paymentStatus === "error") {
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
              console.log(`[Authorize Endpoint] Canceling order ${orderId} due to payment failure status: ${overallState}`);
              await client.query(
                "UPDATE \"order\" SET status = 'canceled', canceled_at = NOW() WHERE id = $1",
                [orderId]
              );

              // Find line items of this order to locate reservations
              const lineItemsRes = await client.query(
                "SELECT item_id FROM order_item WHERE order_id = $1 AND deleted_at IS NULL",
                [orderId]
              );
              const lineItemIds = lineItemsRes.rows.map((r: any) => r.item_id);
              if (lineItemIds.length > 0) {
                const reservationsRes = await client.query(
                  "SELECT id FROM reservation_item WHERE line_item_id = ANY($1) AND deleted_at IS NULL",
                  [lineItemIds]
                );
                const reservationIds = reservationsRes.rows.map((r: any) => r.id);
                if (reservationIds.length > 0) {
                  console.log(`[Authorize Endpoint] Deleting ${reservationIds.length} reservation items for order ${orderId}`);
                  const inventoryService = req.scope.resolve("inventory");
                  await inventoryService.deleteReservationItems(reservationIds);
                }
              }
            }
          } finally {
            await client.end();
          }
        } catch (dbErr: any) {
          console.error("[Authorize Endpoint] Failed to cancel order on payment failure:", dbErr.message);
        }
      }

      res.status(400).json({
        message: `Payment verification failed. Status: ${paymentStatus}`,
        payment_status: paymentStatus
      });
      return;
    }

  res.json({ payment_collection: paymentCollection, authorization: payment })
}
