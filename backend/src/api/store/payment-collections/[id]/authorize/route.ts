import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [paymentCollection] } = await query.graph({
    entity: "payment_collection",
    fields: ["id", "amount", "payment_sessions.*", "payments.*"],
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

  const payments = paymentCollection.payments || []
  let payment: any = payments.find((p: any) => p.payment_session_id === session.id)

  const paymentModuleService = req.scope.resolve("payment")
  const logger = req.scope.resolve("logger") || console;

  const reference = String((session.data as any)?.reference || (session.data as any)?.id || "");
  logger.info(`[Authorize Endpoint] Fetching status on N-Genius for reference: "${reference}"`);

  let overallState = "";
  let statusResponse: any;

  if (reference) {
    try {
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
      const { NGeniusClient } = await import("../../../../../modules/ngenius-payment/ngenius-client.js");
      const ngeniusClient = new NGeniusClient(config as any, logger);

      const isTest = (session.data as any)?.is_test === true || (session.data as any)?.is_test === "true" || reference.startsWith("mock-");
      if (isTest) {
        logger.info(`[Authorize Endpoint] Test payment session detected. Reading status from session data.`);
        statusResponse = {
          status: session.data?.status || "STARTED",
          _embedded: session.data?._embedded,
        };
      } else {
        logger.info(`[Authorize Endpoint] Querying N-Genius status API for: "${reference}"`);
        statusResponse = await ngeniusClient.getOrderStatus(reference);
      }

      logger.info(`[Authorize Endpoint] N-Genius response: ${JSON.stringify(statusResponse)}`);

      const ngeniusPayments = statusResponse._embedded?.payment;
      overallState = String(statusResponse.status || statusResponse.state || "").toUpperCase();
      if (Array.isArray(ngeniusPayments) && ngeniusPayments.length > 0) {
        const latestPayment = ngeniusPayments[ngeniusPayments.length - 1];
        const state = latestPayment.status || latestPayment.state;
        if (state) {
          overallState = String(state).toUpperCase();
        }
      }

      logger.info(`[Authorize Endpoint] Determined overallState status: "${overallState}"`);
    } catch (statusErr: any) {
      logger.error("[Authorize Endpoint] Failed to check status from N-Genius:", statusErr.message);
    }
  }

  let captureSuccessful = false;
  let paymentStatus = "pending";

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

  logger.info(`[Authorize Endpoint] Resolved paymentStatus: "${paymentStatus}", captureSuccessful: ${captureSuccessful}`);

  if (captureSuccessful) {
    // 1. Ensure the session is authorized and payment is created in Medusa
    if (!payment) {
      try {
        logger.info(`[Authorize Endpoint] No payment found in Medusa. Authorizing payment session: "${session.id}"`);
        payment = await paymentModuleService.authorizePaymentSession(session.id, {});
        logger.info(`[Authorize Endpoint] authorizePaymentSession created payment: ${JSON.stringify(payment)}`);
      } catch (authErr: any) {
        logger.error(`[Authorize Endpoint] Failed to authorize payment session: ${authErr.message}`);
      }
    }

    // 2. If N-Genius is CAPTURED, capture it in Medusa
    if (paymentStatus === "captured" && payment) {
      const isAlreadyCaptured = !!payment.captured_at || Number(payment.captured_amount ?? 0) > 0;
      if (!isAlreadyCaptured) {
        try {
          logger.info(`[Authorize Endpoint] Attempting capture for payment: "${payment.id}"`);
          await paymentModuleService.capturePayment({
            payment_id: payment.id,
            amount: payment.amount ?? paymentCollection.amount,
          });
          logger.info(`[Authorize Endpoint] Successfully captured payment in Medusa: "${payment.id}"`);
        } catch (captureErr: any) {
          logger.error(`[Authorize Endpoint] Capture error: ${captureErr.message}`);
        }
      } else {
        logger.info(`[Authorize Endpoint] Payment "${payment.id}" is already marked as captured.`);
      }
    }

    // 3. Restore the order if it was previously cancelled
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

  // Query the updated payment collection to return the latest status and captured amount
  const { data: [updatedPaymentCollection] } = await query.graph({
    entity: "payment_collection",
    fields: ["id", "amount", "captured_amount", "authorized_amount", "status", "payment_sessions.*", "payments.*"],
    filters: { id },
  })

  res.json({ payment_collection: updatedPaymentCollection, authorization: payment })
}
