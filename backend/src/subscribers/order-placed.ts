import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const formatAmount = (amount: number, currency: string) => {
  return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
};

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id
  const logger = container.resolve("logger") || console
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const fields = [
      "id",
      "display_id",
      "created_at",
      "email",
      "total",
      "subtotal",
      "tax_total",
      "shipping_total",
      "discount_total",
      "currency_code",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.address_1",
      "shipping_address.address_2",
      "shipping_address.city",
      "shipping_address.province",
      "shipping_address.postal_code",
      "shipping_address.country_code",
      "shipping_address.phone",
      "items.title",
      "items.quantity",
      "items.unit_price",
      "items.total",
      "payment_collections.amount",
      "payment_collections.payments.provider_id",
    ];

    const { data: orders } = await query.graph({
      entity: "order",
      fields,
      filters: { id: orderId },
    })
    
    const order = orders?.[0]
    
    if (order) {
      logger.info(`[Order Placed Subscriber] Processing order confirmation email for display ID: ${order.display_id || order.id}`);

      // 1. Compile order items HTML rows
      let itemsRows = "";
      const items = Array.isArray((order as any).items) ? (order as any).items : [];
      for (const item of items) {
        itemsRows += `
          <tr>
            <td style="padding: 12px; font-size: 15px; border-bottom: 1px solid #f9f9f9; vertical-align: middle;">
              <span class="item-title">${item.title}</span>
            </td>
            <td style="text-align: center; padding: 12px; font-size: 15px; border-bottom: 1px solid #f9f9f9; vertical-align: middle;">
              ${item.quantity}
            </td>
            <td style="text-align: right; padding: 12px; font-size: 15px; border-bottom: 1px solid #f9f9f9; vertical-align: middle;">
              ${formatAmount(item.total || (item.unit_price * item.quantity), order.currency_code)}
            </td>
          </tr>
        `;
      }

      // 2. Format Shipping Address
      const addr = (order.shipping_address || {}) as any;
      const shippingAddressHtml = `
        ${addr.first_name || ""} ${addr.last_name || ""}<br>
        ${addr.address_1 || ""}<br>
        ${addr.address_2 ? addr.address_2 + "<br>" : ""}
        ${addr.city || ""}, ${addr.province || ""} ${addr.postal_code || ""}<br>
        ${(addr.country_code || "AE").toUpperCase()}<br>
        ${addr.phone ? "Phone: " + addr.phone : ""}
      `;

      // 3. Format Payment Method
      let paymentMethod = "N-Genius Payment";
      const collections = (order as any).payment_collections || [];
      if (collections.length > 0 && collections[0].payments?.length > 0) {
        const providerId = collections[0].payments[0].provider_id;
        if (providerId) {
          paymentMethod = providerId.replace(/^pp_/, "").replace(/-/g, " ").toUpperCase();
        }
      }

      // 4. Format Discounts
      let discountRowHtml = "";
      if (order.discount_total && order.discount_total > 0) {
        discountRowHtml = `
          <div class="totals-row" style="color: #d32f2f;">
            <span>Discount</span>
            <span>-${formatAmount(order.discount_total, order.currency_code)}</span>
          </div>
        `;
      }

      // 5. Format Fulfillments / Tracking Information
      const trackingUrl = `https://dubaipolicestore.ae/order-tracking?id=${order.id}&email=${encodeURIComponent(order.email || "")}`;
      let trackingInfoBlockHtml = "";
      const fulfillments = (order as any).fulfillments || [];
      const trackingNumbers: string[] = [];
      for (const f of fulfillments) {
        if (f.tracking_links && Array.isArray(f.tracking_links)) {
          for (const link of f.tracking_links) {
            if (link.tracking_number) trackingNumbers.push(link.tracking_number);
          }
        } else if (f.data?.tracking_number) {
          trackingNumbers.push(f.data.tracking_number);
        }
      }
      if (trackingNumbers.length > 0) {
        trackingInfoBlockHtml = `
          <div class="meta-item"><span class="meta-label">Tracking Number(s):</span> ${trackingNumbers.join(", ")}</div>
        `;
      }

      // 6. Build template substitutions
      const replacements = {
        customer_name: `${addr.first_name || "Customer"} ${addr.last_name || ""}`.trim(),
        order_display_id: order.display_id || order.id,
        order_date: new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        payment_method: paymentMethod,
        tracking_info_block: trackingInfoBlockHtml,
        order_items_rows: itemsRows,
        subtotal: formatAmount(order.subtotal, order.currency_code),
        shipping_total: formatAmount(order.shipping_total, order.currency_code),
        tax_total: formatAmount(order.tax_total, order.currency_code),
        discount_row_block: discountRowHtml,
        total: formatAmount(order.total, order.currency_code),
        shipping_address_block: shippingAddressHtml,
        tracking_url: trackingUrl,
      };

      // 7. Load and send order confirmation email
      const communicationService = container.resolve("communication") as any;
      const htmlContent = communicationService.loadTemplate("order-confirmation", replacements);

      const emailSent = await communicationService.sendEmail(
        order.email,
        `Dubai Police Store - Order Confirmation #${order.display_id || order.id}`,
        htmlContent
      );

      if (emailSent) {
        logger.info(`[Order Placed Subscriber] Order confirmation email successfully sent to: ${order.email}`);
      } else {
        logger.error(`[Order Placed Subscriber] Failed to send order confirmation email to: ${order.email}`);
      }
    }
  } catch (err: any) {
    logger.error(`[Order Placed Subscriber] Failed to process order placed event: ${err.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
