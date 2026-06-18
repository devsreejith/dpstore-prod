import { useOrderQuery } from '@framework/order/get-order';
import { formatPrice } from '@framework/product/use-price';

const isPaymentSuccessful = (collection: any) => {
  if (!collection) return false;
  
  if (Number(collection.captured_amount ?? 0) > 0 || String(collection.status).toLowerCase() === 'captured') {
    return true;
  }
  
  if (Number(collection.authorized_amount ?? 0) > 0 || String(collection.status).toLowerCase() === 'authorized') {
    let hasNGenius = false;
    let ngeniusSuccess = false;

    if (Array.isArray(collection.payments)) {
      for (const p of collection.payments) {
        if (p.provider_id?.includes('ngenius') && p.data) {
          hasNGenius = true;
          const state = String(p.data.status || p.data.state || '').toUpperCase();
          const embeddedState = String(p.data._embedded?.payment?.[0]?.status || p.data._embedded?.payment?.[0]?.state || '').toUpperCase();
          if (["CAPTURED", "PURCHASED", "SUCCESS", "AUTHORIZED", "AUTH"].includes(state) || 
              ["CAPTURED", "PURCHASED", "SUCCESS", "AUTHORIZED", "AUTH"].includes(embeddedState)) {
            ngeniusSuccess = true;
          }
        }
      }
    }
    
    if (Array.isArray(collection.payment_sessions) && !ngeniusSuccess) {
      for (const s of collection.payment_sessions) {
        if (s.provider_id?.includes('ngenius') && s.data) {
          hasNGenius = true;
          const state = String(s.data.status || s.data.state || '').toUpperCase();
          const embeddedState = String(s.data._embedded?.payment?.[0]?.status || s.data._embedded?.payment?.[0]?.state || '').toUpperCase();
          if (["CAPTURED", "PURCHASED", "SUCCESS", "AUTHORIZED", "AUTH"].includes(state) || 
              ["CAPTURED", "PURCHASED", "SUCCESS", "AUTHORIZED", "AUTH"].includes(embeddedState)) {
            ngeniusSuccess = true;
          }
        }
      }
    }

    if (hasNGenius) {
      return ngeniusSuccess;
    }
    
    return true;
  }
  
  return false;
};

import { useRouter } from 'next/router';
import Button from '@components/ui/button';
import http from '@framework/utils/http';
import { useMemo, useState } from 'react';
import Link from '@components/ui/link';
import { ROUTES } from '@utils/routes';
import { useTranslation } from 'next-i18next';
import {
  IoDocumentTextOutline,
  IoWalletOutline,
  IoAlertCircleOutline,
  IoLocationOutline,
  IoCarOutline,
  IoShieldCheckmarkOutline,
  IoArrowBackOutline,
  IoDownloadOutline,
  IoPhonePortraitOutline,
  IoCheckmarkCircle,
  IoWarningOutline,
  IoHeadsetOutline,
  IoRefreshOutline,
  IoCloseCircleOutline,
  IoCardOutline,
  IoLockClosedOutline,
  IoThumbsUpOutline,
  IoGiftOutline,
  IoCalendarOutline,
  IoHelpCircleOutline,
  IoTrashOutline
} from 'react-icons/io5';

// Beautiful SVG replacement for IoTruckOutline to ensure standard rendering across icon pack versions
const TruckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    height="1.2em"
    width="1.2em"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const normalizeMediaSrc = (src: any) => {
  const v = String(src ?? '').trim();
  if (!v) return '';

  const backend = String(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000').trim().replace(/\/$/, '');

  if (/^https?:\/\//i.test(v)) {
    if (backend && v.startsWith(backend)) {
      return v;
    }
    return v;
  }

  if (v.startsWith('uploads/') || v.startsWith('/uploads/') || v.startsWith('static/') || v.startsWith('/static/')) {
    const cleanPath = v.startsWith('/') ? v : `/${v}`;
    return `${backend}${cleanPath}`;
  }

  if (v.startsWith('/assets/')) return v;
  if (!v.startsWith('/')) return `/${v}`;
  return v;
};

const pickOrderItemThumb = (it: any) => {
  const candidates = [
    it?.thumbnail,
    it?.variant?.product?.thumbnail,
    it?.variant?.product?.images?.[0]?.url,
    it?.variant?.product?.images?.[0]?.src,
    it?.product?.thumbnail,
    it?.product?.images?.[0]?.url,
    it?.product?.images?.[0]?.src,
  ];
  for (const c of candidates) {
    const n = normalizeMediaSrc(c);
    if (n) return n;
  }
  return '';
};

const fmt = (amount: any, currencyCode: any) => {
  const n = typeof amount === 'number' ? amount : Number(amount);
  const code = String(currencyCode || 'AED').toUpperCase();
  if (!Number.isFinite(n)) return '';
  return formatPrice({ amount: n, currencyCode: code, locale: 'en' });
};

const fmtDate = (v: any) => {
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

const fmtDateTime = (v: any) => {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return '';
  const optionsDate: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const optionsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  return `${d.toLocaleDateString('en-US', optionsDate)} at ${d.toLocaleTimeString('en-US', optionsTime)}`;
};

const fmtTimelineTime = (v: any, offsetMinutes = 0) => {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return '';
  if (offsetMinutes) {
    d.setMinutes(d.getMinutes() + offsetMinutes);
  }
  const optionsDate: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const optionsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  return `${d.toLocaleDateString('en-US', optionsDate)}, ${d.toLocaleTimeString('en-US', optionsTime)}`;
};

const fmtOrderDateTime = (dateVal: any) => {
  const d = new Date(dateVal);
  if (!Number.isFinite(d.getTime())) return '';
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;
  return `${dateStr} • ${timeStr}`;
};

const formatAddress = (a: any) => {
  if (!a) return { name: '', lines: [], phone: '' };
  const cc = String(a?.country_code ?? '').toUpperCase();
  const name = `${String(a?.first_name ?? '').trim()} ${String(a?.last_name ?? '').trim()}`.trim();
  const addressLines = [
    a?.address_1,
    a?.address_2,
    [a?.city, a?.province, a?.postal_code].filter(Boolean).join(', '),
    cc === 'AE' ? 'United Arab Emirates' : cc
  ].map(x => String(x ?? '').trim()).filter(Boolean);
  return { name, lines: addressLines, phone: a?.phone ? String(a.phone) : '' };
};

const OrderDetails: React.FC<{ className?: string }> = ({
  className = 'pt-6',
}) => {
  const {
    query: { id, cart_id },
  } = useRouter();
  const router = useRouter();
  const orderIdentifier = (id || cart_id)?.toString()!;
  const { data: order, isLoading } = useOrderQuery(orderIdentifier);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);


  const paymentCollectionId = useMemo(() => {
    const fromArray =
      Array.isArray((order as any)?.payment_collections) && (order as any).payment_collections.length
        ? String((order as any).payment_collections[0]?.id ?? '').trim()
        : '';
    const direct = String((order as any)?.payment_collection_id ?? '').trim();
    return fromArray || direct || '';
  }, [order]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <svg
          className="animate-spin h-10 w-10 text-emerald-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-semibold text-gray-500 font-body">
          Loading order details...
        </span>
      </div>
    );
  }
  if (!order) return <div className="py-10 text-center text-sm text-red-600 font-medium">Order not found.</div>;

  const items = Array.isArray(order?.items) ? order.items : [];
  const currency = String(order?.currency_code ?? 'aed').toUpperCase();
  const paymentProvider = (() => {
    if (!Array.isArray(order?.payment_collections) || !order.payment_collections.length) {
      return '';
    }
    const col = order.payment_collections[0];
    if (Array.isArray(col.payments) && col.payments.length) {
      const p = col.payments.find((py: any) => py.provider_id && py.provider_id !== 'pp_system_default');
      if (p) return String(p.provider_id);
      return String(col.payments[0].provider_id ?? '');
    }
    if (Array.isArray(col.payment_sessions) && col.payment_sessions.length) {
      const s = col.payment_sessions.find((sn: any) => sn.provider_id && sn.provider_id !== 'pp_system_default');
      if (s) return String(s.provider_id);
      return String(col.payment_sessions[0].provider_id ?? '');
    }
    return '';
  })();
  const isCancelled =
    Boolean((order as any)?.canceled_at) || String((order as any)?.status ?? '').toLowerCase() === 'canceled' || String((order as any)?.status ?? '').toLowerCase() === 'cancelled';
  const paymentStatus = String((order as any)?.payment_status ?? '').toLowerCase();
  
  const isOnlinePayment = paymentProvider && paymentProvider !== 'pp_system_default';
  const paymentCollection = Array.isArray(order?.payment_collections) && order.payment_collections.length
    ? order.payment_collections[0]
    : null;

  const capturedAmount = paymentCollection ? Number(paymentCollection.captured_amount ?? 0) : 0;
  const authorizedAmount = paymentCollection ? Number(paymentCollection.authorized_amount ?? 0) : 0;
  const paymentCollectionStatus = String(paymentCollection?.status ?? '').toLowerCase();

  const isPaymentPaid = isOnlinePayment
    ? isPaymentSuccessful(paymentCollection)
    : (paymentStatus === 'captured' || paymentStatus === 'paid' || paymentStatus === 'authorized');
  
  const isPaymentPending = !isPaymentPaid && !isCancelled;

  const display = order?.display_id ?? order?.custom_display_id ?? order?.id;
  const title = display ? `Order #000${display}` : `Order #000${String(order?.id ?? '')}`;

  const shippingAddress = formatAddress(order?.shipping_address);
  const billingAddress = formatAddress(order?.billing_address);

  const shippingMethod = Array.isArray((order as any)?.shipping_methods) && (order as any).shipping_methods.length
    ? String((order as any).shipping_methods[0]?.name ?? '').trim()
    : 'Standard UAE Shipping';

  const createdAt = fmtDateTime((order as any)?.created_at);
  const totalAmount = Number((order as any)?.total ?? 0) || 0;
  const shippingAmount = Number((order as any)?.shipping_total ?? 0) || 0;
  const taxAmount = Number((order as any)?.tax_total ?? (order as any)?.taxes_total ?? 0) || 0;
  const subtotalAmount = totalAmount - shippingAmount; // Exact price paid
  const discountAmount = 0; // Force discount to 0 to hide it

  const continuePayment = async () => {
    if (!paymentCollectionId) {
      setPayError('Online payment is not available for this order.');
      return;
    }
    setPayError(null);
    setCancelError(null);
    setPaying(true);
    try {
      let providerId = paymentProvider;
      if (!providerId || providerId === 'pp_system_default') {
        try {
          const regionId = String((order as any)?.region_id ?? '').trim();
          if (regionId) {
            const resProviders = await http.get(`/store/payment-providers`, {
              params: { region_id: regionId },
            });
            const providers = Array.isArray(resProviders?.data?.payment_providers) ? resProviders.data.payment_providers : [];
            providerId = providers?.find((p: any) => p.id === "pp_ngenius_ngenius" || p.id === "pp_ngenius" || p.id === "ngenius")?.id || providers?.[0]?.id || 'pp_ngenius_ngenius';
          } else {
            providerId = 'pp_ngenius_ngenius';
          }
        } catch {
          providerId = 'pp_ngenius_ngenius';
        }
      }

      // 1. Create the payment session on the backend
      const res = await http.post(`/store/payment-collections/${paymentCollectionId}/payment-sessions`, {
        provider_id: providerId,
        data: {
          order_id: order.id
        },
      });
      const pc = (res as any)?.data?.payment_collection ?? (res as any)?.data?.paymentCollection ?? (res as any)?.data;
      const sessions = Array.isArray(pc?.payment_sessions) ? pc.payment_sessions : [];
      const session = sessions.find(
        (s: any) => s.provider_id === "pp_ngenius_ngenius" || s.provider_id === "pp_ngenius" || s.provider_id === "ngenius" || s.data?.payment_url
      );

      if (!session?.data?.payment_url) {
        throw new Error('Failed to retrieve hosted payment URL from N-Genius.');
      }

      // 2. Redirect customer to N-Genius Hosted Checkout
      if (typeof window !== 'undefined') {
        // Clear transient error UI before navigation so a restored page snapshot
        // does not briefly show stale failure messaging on the way back.
        window.location.href = session.data.payment_url;
      }
    } catch (e: any) {
      const msg = String(e?.response?.data?.message ?? e?.message ?? 'Failed to initialize N-Genius payment.');
      setPayError(msg);
    } finally {
      setPaying(false);
    }
  };

  const cancelOrder = async () => {
    if (isCancelled) return;
    if (typeof window !== 'undefined' && !window.confirm('Cancel this order?')) return;
    setCancelError(null);
    setCanceling(true);
    const orderId = String((order as any)?.id ?? '').trim();
    try {
      if (!orderId) throw new Error('Order not found');
      await http.post(`/store/orders/${orderId}/cancel`, { email: order?.email });
      router.reload();
    } catch (e: any) {
      const msg = String(e?.response?.data?.message ?? e?.message ?? 'Failed to cancel order');
      setCancelError(msg);
    } finally {
      setCanceling(false);
    }
  };

  const fulfillmentStatus = String((order as any)?.fulfillment_status ?? '').toLowerCase();
  const isShipped = ['shipped', 'out_for_delivery', 'delivered'].includes(fulfillmentStatus);
  const isOutForDelivery = ['out_for_delivery', 'delivered'].includes(fulfillmentStatus);
  const isDelivered = fulfillmentStatus === 'delivered';

  const sellerName = String((order as any)?.metadata?.seller_name || 'HouseHoldProduct');
  const paymentMethodName = paymentProvider === 'pp_system_default' || !paymentProvider ? 'Cash On Delivery' : 'Online';

  const originalSubtotal = subtotalAmount;

  const displayPaymentMethod = paymentMethodName;

  const getFriendlyOrderNumber = (o: any) => {
    if (o?.metadata?.order_number) {
      return String(o.metadata.order_number);
    }
    const orderDate = o?.created_at ? new Date(o.created_at) : new Date();
    const yyVal = String(orderDate.getFullYear()).slice(-2);
    const displayIdStrVal = String(o?.display_id ?? '1').padStart(4, '0');
    return `ORD-OL${yyVal}-${displayIdStrVal}`;
  };

  const formattedOrderNumber = getFriendlyOrderNumber(order);

  const getEstimatedDeliveryDate = (createdAtVal: any) => {
    const d = createdAtVal ? new Date(createdAtVal) : new Date();
    if (!Number.isFinite(d.getTime())) return '';
    const start = new Date(d);
    start.setDate(start.getDate() + 2);
    const end = new Date(d);
    end.setDate(end.getDate() + 4);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const handleDownloadInvoice = () => {
    if (!order) return;
    const invoiceWindow = window.open('', '_blank');
    if (!invoiceWindow) {
      alert('Please allow popups to download the invoice.');
      return;
    }

    const friendlyOrderNumber = formattedOrderNumber;
    const currency = String(order.currency_code ?? 'AED').toUpperCase();

    const itemsHtml = items.map((it: any) => {
      const qty = Number(it.quantity ?? 1);
      const totalVal = Number(it.total ?? it.unit_price * qty);
      const unitVal = totalVal / qty;
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; color: #111;">${it.title || it.product_title}</div>
            <div style="font-size: 11px; color: #666;">SKU: ${it.variant?.sku || 'N/A'}</div>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${fmt(unitVal, currency)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${qty}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${fmt(totalVal, currency)}</td>
        </tr>
      `;
    }).join('');

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${friendlyOrderNumber}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            margin: 0;
            padding: 40px;
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            border: 1px solid #eee;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
            padding: 30px;
            border-radius: 8px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #008755;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #008755;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #111;
            text-align: right;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .meta-section h3 {
            font-size: 14px;
            color: #777;
            text-transform: uppercase;
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            padding-bottom: 4px;
          }
          .meta-section p {
            margin: 4px 0;
            font-size: 14px;
            line-height: 1.4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background: #f8f8f8;
            padding: 12px;
            font-size: 12px;
            text-transform: uppercase;
            color: #555;
            border-bottom: 2px solid #eee;
          }
          .totals-table {
            width: 300px;
            margin-left: auto;
            margin-top: 20px;
          }
          .totals-table td {
            padding: 8px 12px;
            font-size: 14px;
          }
          .totals-table tr.grand-total td {
            font-size: 16px;
            font-weight: bold;
            color: #008755;
            border-top: 2px solid #eee;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #999;
            margin-top: 50px;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          @media print {
            body { padding: 0; }
            .invoice-box { border: none; box-shadow: none; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="logo">Dubai Police Store</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Dubai, United Arab Emirates</div>
            </div>
            <div>
              <div class="title">INVOICE</div>
              <div style="font-size: 14px; text-align: right; color: #555; margin-top: 5px;">
                <strong>Invoice ID:</strong> ${friendlyOrderNumber}
              </div>
              <div style="font-size: 14px; text-align: right; color: #555; margin-top: 3px;">
                <strong>Date:</strong> ${fmtDate(order.created_at)}
              </div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-section">
              <h3>Billed To</h3>
              <p><strong>${billingAddress.name}</strong></p>
              ${billingAddress.lines.map(line => `<p>${line}</p>`).join('')}
              ${billingAddress.phone ? `<p>Phone: ${billingAddress.phone}</p>` : ''}
              <p>Email: ${order.email}</p>
            </div>
            <div class="meta-section">
              <h3>Shipped To</h3>
              <p><strong>${shippingAddress.name}</strong></p>
              ${shippingAddress.lines.map(line => `<p>${line}</p>`).join('')}
              ${shippingAddress.phone ? `<p>Phone: ${shippingAddress.phone}</p>` : ''}
            </div>
          </div>

          <div class="meta-grid" style="margin-bottom: 20px;">
            <div class="meta-section">
              <h3>Payment Method</h3>
              <p>${displayPaymentMethod}</p>
              <p>Status: ${isPaymentPaid ? 'Paid' : 'Pending'}</p>
            </div>
            <div class="meta-section">
              <h3>Shipping Method</h3>
              <p>${shippingMethod}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item Description</th>
                <th style="text-align: center; width: 120px;">Unit Price</th>
                <th style="text-align: center; width: 80px;">Qty</th>
                <th style="text-align: right; width: 120px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right; font-weight: 500;">${fmt(subtotalAmount, currency)}</td>
            </tr>
            <tr>
              <td>Delivery Charges:</td>
              <td style="text-align: right; font-weight: 500;">${shippingAmount === 0 ? 'Free' : fmt(shippingAmount, currency)}</td>
            </tr>
            <tr class="grand-total">
              <td>Total Amount:</td>
              <td style="text-align: right;">${fmt(totalAmount, currency)}</td>
            </tr>
          </table>

          <div class="footer">
            <p>Thank you for shopping with Dubai Police Official Merchandise Online Store</p>
            <p style="font-size: 10px; margin-top: 5px;">If you have any questions, please contact support.</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    invoiceWindow.document.write(invoiceHtml);
    invoiceWindow.document.close();
  };

  return (
    <div className={`${className} bg-transparent min-h-screen pb-12 font-body`}>
      <Link href={ROUTES.ORDERS} className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-black transition gap-2 mb-5 font-body">
        <IoArrowBackOutline className="text-base" /> Back to Orders
      </Link>

      <h1 className="text-xl md:text-2xl font-bold text-heading font-body mb-4 text-left">
        Order Details
      </h1>

      {/* Payment Status Alert Box */}
      <div className={`w-full border rounded-xl p-4 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isCancelled
          ? 'bg-[#FEF2F2] border-[#FEE2E2] text-rose-700'
          : isPaymentPaid || !isOnlinePayment
            ? 'bg-[#F4F9F6] border-[#E8F1EC] text-[#008755]'
            : 'bg-[#FEF2F2] border-[#FEE2E2] text-rose-700'
      }`}>
        <div className="flex items-center gap-3.5">
          {isCancelled ? (
            <IoCloseCircleOutline className="text-xl text-rose-500 flex-shrink-0" />
          ) : isPaymentPaid || !isOnlinePayment ? (
            <IoCheckmarkCircle className="text-xl text-[#008755] flex-shrink-0" />
          ) : (
            <IoAlertCircleOutline className="text-xl text-rose-500 flex-shrink-0" />
          )}
          <div className="text-left font-body">
            <h4 className="text-xs md:text-sm font-bold">
              {isCancelled
                ? 'Order Cancelled'
                : !isOnlinePayment
                  ? 'Order Confirmed'
                  : isPaymentPaid
                    ? 'Payment Successful'
                    : 'Payment Failed'}
            </h4>
            <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
              {isCancelled
                ? 'This order has been cancelled.'
                : !isOnlinePayment
                  ? 'Your order has been placed successfully. Payment will be collected upon delivery.'
                  : isPaymentPaid
                    ? 'Your order has been placed successfully.'
                    : 'Your payment attempt was unsuccessful. Please retry payment.'}
            </p>
          </div>
        </div>

        {isPaymentPending && !isCancelled && isOnlinePayment && (
          <button
            type="button"
            onClick={continuePayment}
            disabled={paying || canceling}
            className="md:self-center self-start h-9 px-5 bg-[#005844] hover:bg-black text-white font-bold text-xs md:text-sm rounded-lg transition duration-200 flex items-center justify-center font-body shadow-sm"
          >
            <span>{paying ? 'Processing...' : 'Retry Payment'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-body">
        {/* Left main area (col-span-8) */}
        <div className="lg:col-span-8 space-y-4 w-full">
          {/* Metadata details card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:divide-x md:divide-gray-200 border border-gray-150 rounded-xl bg-white p-5 mb-5 font-body text-left shadow-sm">
            <div className="flex flex-col">
              <span className="text-gray-500 text-[10px] md:text-[11px] font-bold uppercase tracking-wider mb-1">Order ID</span>
              <span className="text-xs md:text-sm font-semibold text-heading">{formattedOrderNumber}</span>
            </div>
            <div className="flex flex-col md:pl-6">
              <span className="text-gray-500 text-[10px] md:text-[11px] font-bold uppercase tracking-wider mb-1">Order Date</span>
              <span className="text-xs md:text-sm font-semibold text-heading">{fmtOrderDateTime(order?.created_at)}</span>
            </div>
            <div className="flex flex-col md:pl-6">
              <span className="text-gray-500 text-[10px] md:text-[11px] font-bold uppercase tracking-wider mb-1">Payment Method</span>
              <span className="text-xs md:text-sm font-semibold text-heading">
                {displayPaymentMethod}
              </span>
            </div>
            <div className="flex flex-col md:pl-6">
              <span className="text-gray-500 text-[10px] md:text-[11px] font-bold uppercase tracking-wider mb-1">Total Amount</span>
              <span className="text-xs md:text-sm font-semibold text-heading">{fmt(totalAmount, currency)}</span>
            </div>
          </div>

          {/* Delivery Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-gray-200 border border-gray-150 rounded-xl p-5 bg-white mb-5 text-left font-body shadow-sm">
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm text-heading uppercase tracking-wide">Delivery Address</h4>
                <span className="text-emerald-600 text-xs font-bold hover:underline cursor-pointer">Change</span>
              </div>
              <div className="text-xs md:text-sm text-gray-700 font-medium leading-relaxed space-y-0.5">
                {shippingAddress.name && <div className="font-bold text-heading mb-0.5">{shippingAddress.name}</div>}
                {shippingAddress.lines.map((l: any, idx: number) => (
                  <div key={idx}>{l}</div>
                ))}
                {shippingAddress.phone && <div className="mt-1 font-semibold text-heading">{shippingAddress.phone}</div>}
              </div>
            </div>

            <div className="flex flex-col md:pl-6 pt-5 md:pt-0">
              <h4 className="font-bold text-sm text-heading uppercase tracking-wide mb-3">Delivery Method</h4>
              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-heading">
                <TruckIcon className="text-lg text-gray-400 flex-shrink-0" />
                <span>{shippingMethod}</span>
              </div>
              <p className="text-[11px] md:text-xs text-gray-600 font-medium mt-1">
                Estimated delivery: {getEstimatedDeliveryDate(order?.created_at)}
              </p>
              <div className={`font-bold text-xs md:text-sm mt-1 uppercase ${
                shippingAmount === 0 ? 'text-[#008755]' : 'text-heading font-mono'
              }`}>
                {shippingAmount === 0 ? 'FREE' : fmt(shippingAmount, currency)}
              </div>
            </div>
          </div>

          {/* Order Items Table Card */}
          <div className="border border-gray-150 rounded-xl bg-white p-5 mb-5 font-body text-left shadow-sm">
            <h3 className="font-bold text-sm text-heading border-b border-gray-100 pb-3 mb-4 uppercase tracking-wider">
              Order Items ({items.length})
            </h3>
            
            <div className="hidden md:grid grid-cols-12 gap-4 pb-2.5 border-b border-gray-100 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Unit Price</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            <div className="divide-y divide-gray-100">
              {items.map((it: any) => {
                const itemThumb = pickOrderItemThumb(it);
                const itemQty = Number(it.quantity ?? 1);
                const itemTotalVal = Number(it.total ?? it.unit_price * itemQty);
                const itemUnitVal = itemTotalVal / itemQty;

                return (
                  <div key={it.id} className="py-4 first:pt-4 last:pb-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Product Details (6 Cols) */}
                    <div className="md:col-span-6 flex gap-4 items-center">
                      <div className="w-16 h-16 rounded border border-gray-150 overflow-hidden bg-white p-1 flex items-center justify-center flex-shrink-0">
                        <img src={itemThumb} alt="" className="object-contain max-h-full max-w-full" />
                      </div>
                      <div className="min-w-0 text-left">
                        <h4 className="text-sm font-bold text-heading truncate">{it.title || it.product_title}</h4>
                        <p className="text-[11px] text-gray-600 font-medium mt-0.5">SKU: {it.variant?.sku || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {/* Unit Price (2 Cols) */}
                    <div className="md:col-span-2 text-left md:text-center">
                      <span className="text-xs text-gray-400 md:hidden block uppercase tracking-wider font-semibold mb-0.5">Unit Price</span>
                      <span className="text-sm font-bold text-heading font-mono">{fmt(itemUnitVal, currency)}</span>
                    </div>

                    {/* Qty (2 Cols) */}
                    <div className="md:col-span-2 text-left md:text-center">
                      <span className="text-xs text-gray-400 md:hidden block uppercase tracking-wider font-semibold mb-0.5">Qty</span>
                      <span className="text-sm font-semibold text-heading font-mono">{itemQty}</span>
                    </div>

                    {/* Total (2 Cols) */}
                    <div className="md:col-span-2 text-left md:text-right">
                      <span className="text-xs text-gray-400 md:hidden block uppercase tracking-wider font-semibold mb-0.5">Total</span>
                      <span className="text-sm font-bold text-heading font-mono">{fmt(itemTotalVal, currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error messages */}
          {payError && (
            <div className="w-full bg-red-50 border border-red-200 text-red-600 rounded-lg p-3.5 text-xs font-semibold mt-4 flex items-center gap-2 font-body text-left">
              <span>⚠️</span> {payError}
            </div>
          )}
          {cancelError && (
            <div className="w-full bg-red-50 border border-red-200 text-red-600 rounded-lg p-3.5 text-xs font-semibold mt-4 flex items-center gap-2 font-body text-left">
              <span>⚠️</span> {cancelError}
            </div>
          )}

          {/* Action buttons at the bottom */}
          <div className="flex gap-3 w-full justify-start mt-6 flex-wrap">
            <Link
              href="/"
              className="h-9 px-4 border border-gray-300 hover:bg-gray-50 text-heading font-bold text-xs md:text-sm rounded-lg transition duration-200 flex items-center justify-center gap-1.5 font-body"
            >
              <IoArrowBackOutline className="text-base" />
              <span>Continue Shopping</span>
            </Link>

            {isPaymentPending && !isCancelled && (
              <button
                type="button"
                onClick={cancelOrder}
                disabled={paying || canceling}
                className="h-9 px-4 border border-red-200 hover:bg-red-50 text-red-500 font-bold text-xs md:text-sm rounded-lg transition duration-200 flex items-center justify-center gap-1.5 font-body"
              >
                <IoTrashOutline className="text-base" />
                <span>{canceling ? 'Cancelling...' : 'Cancel Order'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right sidebar area (col-span-4) */}
        <div className="lg:col-span-4 space-y-4 w-full">
          {/* Download Invoice Button */}
          {!isCancelled && (!isOnlinePayment || isPaymentPaid) && (
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="w-full h-11 border border-gray-300 hover:bg-gray-50 text-heading font-bold text-xs md:text-sm rounded-lg transition duration-200 flex items-center justify-center gap-2 font-body mb-1"
            >
              <svg className="w-4 h-4 text-heading" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Invoice</span>
            </button>
          )}

          {/* PRICE DETAILS Card */}
          <div className="border border-gray-150 rounded-xl bg-white p-5 text-left font-body shadow-sm">
            <h3 className="font-bold text-xs text-heading border-b border-gray-100 pb-2.5 mb-3.5 uppercase tracking-wider font-body">
              Price details
            </h3>

            <div className="space-y-4 text-xs md:text-sm text-heading font-medium">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-normal">Price ({items.length} item{items.length > 1 ? "s" : ""})</span>
                <span className="font-mono text-heading font-semibold">{fmt(subtotalAmount, currency)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-normal">Delivery Charges</span>
                <span className={`text-xs ${
                  shippingAmount === 0 ? 'text-emerald-600 font-bold uppercase' : 'text-heading font-semibold font-mono'
                }`}>
                  {shippingAmount === 0 ? 'Free' : fmt(shippingAmount, currency)}
                </span>
              </div>

              <div className="border-t border-gray-150 pt-4 flex justify-between items-center font-bold text-sm md:text-base text-heading">
                <span>Total Amount</span>
                <span className="font-mono">{fmt(totalAmount, currency)}</span>
              </div>
            </div>

            <div className={`rounded p-2.5 mt-4 text-xs font-bold text-center border ${
              isCancelled
                ? 'bg-rose-50 border-rose-100 text-rose-700'
                : isPaymentPaid && paymentProvider !== 'pp_system_default'
                  ? 'bg-[#F4F9F6] border-[#E8F1EC] text-[#008755]'
                  : (paymentProvider === 'pp_system_default' || !paymentProvider
                      ? 'bg-amber-50 border-amber-100 text-[#D97706]'
                      : 'bg-rose-50 border-rose-100 text-rose-700')
            }`}>
              {isCancelled
                ? 'Order Cancelled'
                : isPaymentPaid && paymentProvider !== 'pp_system_default'
                  ? `Paid By ${paymentMethodName}`
                  : (paymentProvider === 'pp_system_default' || !paymentProvider
                      ? 'Pending (Pay on Delivery)'
                      : 'Payment Failed')}
            </div>
          </div>

          {/* Safe & secure badge */}
          <div className="flex items-center gap-2 text-left font-body text-gray-400 py-1.5 px-0.5">
            <IoShieldCheckmarkOutline className="text-xl text-gray-400 flex-shrink-0" />
            <span className="text-[9px] md:text-[10px] font-bold leading-normal tracking-wide uppercase">
              SAFE AND SECURE PAYMENTS. 100% AUTHENTIC PRODUCTS.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
