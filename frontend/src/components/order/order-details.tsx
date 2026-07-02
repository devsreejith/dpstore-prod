import { useOrderQuery } from '@framework/order/get-order';
import Loader from '@components/ui/loader';
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

/**
 * Returns true when the user placed the order but never completed the payment
 * (session is in STARTED/pending state with no failure). Used to show
 * "Payment Pending" instead of "Payment Failed".
 */
const isPaymentNeverAttempted = (collection: any) => {
  if (!collection) return false;
  // If already captured/authorized, it's not "never attempted"
  if (Number(collection.captured_amount ?? 0) > 0) return false;
  if (Number(collection.authorized_amount ?? 0) > 0) return false;

  const FAILED_STATES = ['FAILED', 'DECLINED', 'REJECTED', 'CANCELLED', 'CANCELED'];
  const STARTED_STATES = ['STARTED', 'PENDING', 'INITIATED'];

  // Check payment_sessions for the N-Genius state
  if (Array.isArray(collection.payment_sessions)) {
    for (const s of collection.payment_sessions) {
      if (s.provider_id?.includes('ngenius') && s.data) {
        const state = String(s.data.status || s.data.state || '').toUpperCase();
        const embeddedState = String(s.data._embedded?.payment?.[0]?.status || s.data._embedded?.payment?.[0]?.state || '').toUpperCase();
        // If any embedded payment explicitly failed, it was attempted
        if (FAILED_STATES.includes(embeddedState)) return false;
        if (FAILED_STATES.includes(state)) return false;
        // If top-level state is STARTED/PENDING, user never completed payment
        if (STARTED_STATES.includes(state)) return true;
      }
    }
  }

  // Also check payments array
  if (Array.isArray(collection.payments)) {
    for (const p of collection.payments) {
      if (p.provider_id?.includes('ngenius') && p.data) {
        const state = String(p.data.status || p.data.state || '').toUpperCase();
        if (FAILED_STATES.includes(state)) return false;
        if (STARTED_STATES.includes(state)) return true;
      }
    }
  }

  // No N-Genius session data at all — treat as never attempted (default new order)
  return true;
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
  const { t } = useTranslation('common');
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
      <Loader
        size="large"
        text={t('text-loading-order')}
      />
    );
  }
  if (!order) return <div className="py-10 text-center text-sm text-red-600 font-medium">{t('text-order-not-found')}</div>;

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
  
  const isCustomerCancelled = order?.metadata?.customer_cancelled === 'true' || order?.metadata?.customer_cancelled === true;
  const isGenuinelyCancelled = isCancelled && (!isOnlinePayment || isPaymentPaid || isCustomerCancelled);
  const isPaymentPending = !isPaymentPaid;
  // True when the user placed the order but never went through the payment page
  const isPaymentNeverAttemptedResult = isOnlinePayment && isPaymentPending && isPaymentNeverAttempted(paymentCollection);
  // True when a payment was actually submitted but declined/failed by the gateway
  const isPaymentActuallyFailed = isOnlinePayment && isPaymentPending && !isPaymentNeverAttemptedResult;

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
  const taxAmount = (totalAmount / 105) * 5;
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
    if (isGenuinelyCancelled) return;
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

  const orderStatus = String((order as any)?.status ?? '').toLowerCase();

  // Derive fulfillment status from top-level field or fallback to fulfillments array
  let fulfillmentStatus = String((order as any)?.fulfillment_status ?? '').toLowerCase();
  if (!fulfillmentStatus || fulfillmentStatus === 'not_fulfilled') {
    const fulfillments = Array.isArray((order as any)?.fulfillments) ? (order as any).fulfillments : [];
    const activeFulfillments = fulfillments.filter((f: any) => f && !f.canceled_at);
    if (activeFulfillments.length > 0) {
      const allDelivered = activeFulfillments.every((f: any) => f.delivered_at);
      const anyShipped = activeFulfillments.some((f: any) => f.shipped_at);
      if (allDelivered) {
        fulfillmentStatus = 'delivered';
      } else if (anyShipped) {
        fulfillmentStatus = 'shipped';
      } else {
        fulfillmentStatus = 'fulfilled';
      }
    }
  }

  const isDelivered = fulfillmentStatus === 'delivered' || orderStatus === 'completed' || orderStatus === 'delivered';
  const isShipped = ['shipped', 'partially_shipped', 'out_for_delivery', 'delivered'].includes(fulfillmentStatus) || isDelivered;
  const isOutForDelivery = ['out_for_delivery', 'delivered'].includes(fulfillmentStatus) || isDelivered;

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
    const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/assets/images/Al-Jaber-Gallery-Logo.png` : '';

    // Chunk items into lists of up to 5 items
    const itemChunks: any[][] = [];
    for (let i = 0; i < items.length; i += 5) {
      itemChunks.push(items.slice(i, i + 5));
    }
    if (itemChunks.length === 0) {
      itemChunks.push([]);
    }

    const pagesHtmlList = itemChunks.map((chunk, pageIndex) => {
      const isFirstPage = pageIndex === 0;
      const isLastPage = pageIndex === itemChunks.length - 1;

      // Render items for this chunk
      const chunkItemsHtmlList = chunk.map((it: any) => {
        const qty = Number(it.quantity ?? 1);
        const totalVal = Number(it.total ?? it.unit_price * qty);
        const unitVal = totalVal / qty;
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #ccc;">
              <div style="font-weight: bold; color: #000;">${it.title || it.product_title}</div>
              <div style="font-size: 11px; color: #000;">SKU: ${it.variant?.sku || 'N/A'}</div>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #ccc; text-align: center; color: #000;">${fmt(unitVal, currency)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #ccc; text-align: center; color: #000;">${qty}</td>
            <td style="padding: 12px; border-bottom: 1px solid #ccc; text-align: right; font-weight: bold; color: #000;">${fmt(totalVal, currency)}</td>
          </tr>
        `;
      });

      const chunkItemsHtml = chunkItemsHtmlList.join('');

      let topHtml = '';
      if (isFirstPage) {
        topHtml = `
          <div class="header">
            <div>
              ${logoUrl ? `<img src="${logoUrl}" alt="Al Jaber Gallery" style="max-height: 60px; margin-bottom: 10px; display: block;" />` : ''}
              <div class="logo">Dubai Police Store</div>
              <div style="font-size: 12px; font-weight: bold; color: #000; margin-top: 2px;">AL JABER GALLERY LLC</div>
              <div style="font-size: 12px; color: #000; margin-top: 2px;">P O Box: 1940, United Arab Emirates, Dubai</div>
            </div>
            <div>
              <div class="title">INVOICE</div>
              <div style="font-size: 14px; text-align: right; color: #000; margin-top: 5px;">
                <strong>Invoice ID:</strong> ${friendlyOrderNumber}
              </div>
              <div style="font-size: 14px; text-align: right; color: #000; margin-top: 3px;">
                <strong>TRN:</strong> 100308821600003
              </div>
              <div style="font-size: 14px; text-align: right; color: #000; margin-top: 3px;">
                <strong>Date:</strong> ${fmtDate(order.created_at)}
              </div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-section">
              <h3>Billed To</h3>
              <p><strong>${billingAddress.name}</strong></p>
              <p>${billingAddress.lines.join(', ')}</p>
              <p>${billingAddress.phone ? `Ph: ${billingAddress.phone} | ` : ''}Em: ${order.email}</p>
            </div>
            <div class="meta-section">
              <h3>Shipped To</h3>
              <p><strong>${shippingAddress.name}</strong></p>
              <p>${shippingAddress.lines.join(', ')}</p>
              ${shippingAddress.phone ? `<p>Ph: ${shippingAddress.phone}</p>` : ''}
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
        `;
      } else {
        topHtml = `
          <div class="header" style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
            <div>
              <div class="logo">Dubai Police Store</div>
            </div>
            <div>
              <div class="title" style="font-size: 20px;">INVOICE (Page ${pageIndex + 1})</div>
              <div style="font-size: 12px; text-align: right; color: #000; margin-top: 5px;">
                <strong>Invoice ID:</strong> ${friendlyOrderNumber}
              </div>
            </div>
          </div>
        `;
      }

      let bottomHtml = '';
      if (isLastPage) {
        bottomHtml = `
          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right; font-weight: 500;">${fmt(subtotalAmount, currency)}</td>
            </tr>
            <tr>
              <td>Delivery Charges:</td>
              <td style="text-align: right; font-weight: 500;">${shippingAmount === 0 ? 'Free' : fmt(shippingAmount, currency)}</td>
            </tr>
            <tr>
              <td>VAT (5%):</td>
              <td style="text-align: right; font-weight: 500;">${fmt(taxAmount, currency)}</td>
            </tr>
            <tr class="grand-total">
              <td>Total Amount:</td>
              <td style="text-align: right;">${fmt(totalAmount, currency)}</td>
            </tr>
          </table>

          <div class="footer">
            <p>Thank you for shopping with Dubai Police Official Merchandise Online Store</p>
            <p style="font-size: 11px; margin-top: 5px; color: #000;">If you have any questions, please contact support.</p>
            <p style="font-size: 11px; margin-top: 2px; color: #000;">Mail: contact@dubaipolicestore.ae &nbsp;|&nbsp; Call/Whatsapp: +97155 600 2110</p>
          </div>
        `;
      }

      const pageBreakStyle = !isLastPage ? 'style="page-break-after: always;"' : '';

      return `
        <div class="invoice-box" ${pageBreakStyle}>
          ${topHtml}

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
              ${chunkItemsHtml}
            </tbody>
          </table>

          ${bottomHtml}
        </div>
      `;
    }).join('');

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title> </title>
        <style>
          @page {
            margin: 15mm 10mm 15mm 10mm;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #000;
            margin: 0;
            padding: 40px;
          }
          .invoice-box {
            max-width: 800px;
            margin: 20px auto;
            border: 1px solid #eee;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
            padding: 30px;
            border-radius: 8px;
            background: #fff;
            position: relative;
            min-height: calc(100vh - 80px);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #000;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #000;
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
            color: #000;
            text-transform: uppercase;
            margin-bottom: 8px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
          }
          .meta-section p {
            margin: 4px 0;
            font-size: 14px;
            line-height: 1.4;
            color: #000;
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
            color: #000;
            border-bottom: 1px solid #ccc;
          }
          .totals-table {
            width: 300px;
            margin-left: auto;
            margin-top: 20px;
          }
          .totals-table td {
            padding: 8px 12px;
            font-size: 14px;
            color: #000;
          }
          .totals-table tr.grand-total td {
            font-size: 16px;
            font-weight: bold;
            color: #000;
            border-top: 1px solid #ccc;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #000;
            border-top: 1px solid #ccc;
            padding-top: 20px;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
          }
          @media print {
            body { padding: 0; }
            .invoice-box { border: none; box-shadow: none; padding: 0; margin: 0; min-height: 100vh; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${pagesHtmlList}
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

  // Determine order status step for the timeline
  const getOrderStep = () => {
    if (isGenuinelyCancelled) return -1;
    if (isDelivered) return 4;
    if (isShipped) return 3;
    if (['fulfilled', 'partially_fulfilled', 'processing', 'packed'].includes(fulfillmentStatus)) return 2;
    // If order is confirmed (not cancelled, payment ok)
    if (isPaymentPaid || !isOnlinePayment) return 1;
    return 0;
  };
  const orderStep = getOrderStep();

  const timelineSteps = [
    { label: 'Order Placed', key: 'placed' },
    { label: 'Confirmed', key: 'confirmed' },
    { label: 'Processing', key: 'processing' },
    { label: 'Shipped', key: 'shipped' },
    { label: 'Delivered', key: 'delivered' },
  ];

  const estimatedDelivery = getEstimatedDeliveryDate(order?.created_at);

  return (
    <div className={`${className} bg-transparent min-h-screen pb-12 font-body`}>
      {/* Back to Orders */}
      <Link href={ROUTES.ORDERS} className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-black transition gap-2 mb-5 font-body">
        <IoArrowBackOutline className="text-base transform rtl:rotate-180" /> {t('text-back-to-orders')}
      </Link>

      {/* Page Title + Header Row */}
      <h1 className="text-xl md:text-2xl font-bold text-heading font-body mb-1 ltr:text-left rtl:text-right">
        {t('text-order-details')}
      </h1>

      {/* Order Number + Placed On + Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-sm md:text-base font-medium text-heading">{t('text-order-id')} : <span className="text-[#008755] font-bold">#{formattedOrderNumber}</span></h2>
          <p className="text-xs text-black mt-0.5">{t('text-placed-on')} {fmtOrderDateTime(order?.created_at)}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* Download Invoice */}
          {!isGenuinelyCancelled && (!isOnlinePayment || isPaymentPaid) && (
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="h-10 px-5 border border-gray-300 hover:bg-gray-50 text-heading font-bold text-xs md:text-sm rounded-lg transition duration-200 flex items-center justify-center gap-2 font-body bg-white"
            >
              <IoDownloadOutline className="text-base" />
              <span>{t('text-download-invoice')}</span>
            </button>
          )}
          {/* Track Order - only show after shipping started */}
          {isShipped && !isGenuinelyCancelled && (
            <button
              type="button"
              className="h-10 px-5 bg-[#005844] hover:bg-[#008755] text-white font-bold text-xs md:text-sm rounded-lg transition duration-200 flex items-center justify-center gap-2 font-body shadow-sm"
            >
              <TruckIcon className="text-base" style={{ width: '1em', height: '1em' }} />
              <span>{t('text-track-order')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-body">
        {/* Left main area (col-span-8) */}
        <div className="lg:col-span-8 space-y-4 w-full">

          {/* Order Status Banner */}
          <div className={`w-full border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            isGenuinelyCancelled
              ? 'bg-[#FEF2F2] border-[#FEE2E2]'
              : isPaymentPaid || !isOnlinePayment
                ? 'bg-[#F4F9F6] border-[#E8F1EC]'
                : isPaymentNeverAttemptedResult
                  ? 'bg-[#FFFBEB] border-[#FDE68A]'
                  : 'bg-[#FEF2F2] border-[#FEE2E2]'
          }`}>
            <div className="flex items-center gap-3.5">
              {isGenuinelyCancelled ? (
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <IoCloseCircleOutline className="text-2xl text-rose-500" />
                </div>
              ) : isPaymentPaid || !isOnlinePayment ? (
                <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                  <IoCheckmarkCircle className="text-2xl text-[#008755]" />
                </div>
              ) : isPaymentNeverAttemptedResult ? (
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <IoWalletOutline className="text-2xl text-amber-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <IoAlertCircleOutline className="text-2xl text-rose-500" />
                </div>
              )}
              <div className="ltr:text-left rtl:text-right font-body">
                <h4 className={`text-sm md:text-base font-bold ${
                  isGenuinelyCancelled
                    ? 'text-rose-700'
                    : isPaymentPaid || !isOnlinePayment
                      ? 'text-[#008755]'
                      : isPaymentNeverAttemptedResult
                        ? 'text-amber-700'
                        : 'text-rose-700'
                }`}>
                  {isGenuinelyCancelled
                    ? t('text-order-cancelled')
                    : !isOnlinePayment
                      ? t('text-order-confirmed')
                      : isPaymentPaid
                        ? t('text-payment-successful')
                        : isPaymentNeverAttemptedResult
                          ? t('text-payment-pending')
                          : t('text-payment-failed')}
                </h4>
                <p className="text-[11px] md:text-xs text-black mt-0.5">
                  {isGenuinelyCancelled
                    ? t('text-order-cancelled-desc')
                    : !isOnlinePayment
                      ? t('text-order-confirmed-desc')
                      : isPaymentPaid
                        ? t('text-order-paid-desc')
                        : isPaymentNeverAttemptedResult
                          ? t('text-payment-awaiting-desc')
                          : t('text-payment-failed-retry')}
                </p>
              </div>
            </div>

            {/* Right side: Pay / Retry button */}
            {isPaymentPending && !isGenuinelyCancelled && isOnlinePayment && (
              <button
                type="button"
                onClick={continuePayment}
                disabled={paying || canceling}
                className={`md:self-center self-start h-9 px-5 text-white font-bold text-xs md:text-sm rounded-lg transition duration-200 flex items-center justify-center font-body shadow-sm ${
                  isPaymentNeverAttemptedResult
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-[#005844] hover:bg-[#008755]'
                }`}
              >
                <span>{paying ? t('text-processing') : isPaymentNeverAttemptedResult ? t('text-proceed-to-payment') : t('text-retry-payment')}</span>
              </button>
            )}
          </div>

          {/* Progress Timeline */}
          {!isGenuinelyCancelled && (
            <div className="border border-gray-150 rounded-xl bg-white px-6 py-5 shadow-sm">
              <div className="flex items-center justify-between w-full relative">
                {timelineSteps.map((step, idx) => {
                  const isCompleted = orderStep >= idx;
                  return (
                    <div key={step.key} className="flex flex-col items-center relative" style={{ flex: 1 }}>
                      {/* Connector line (left side) - z-0 so it goes behind circles */}
                      {idx > 0 && (
                        <div
                          className="absolute top-3 h-0.5 ltr:right-1/2 rtl:left-1/2"
                          style={{
                            width: '100%',
                            backgroundColor: orderStep >= idx ? '#008755' : '#E5E7EB',
                            zIndex: 0,
                          }}
                        />
                      )}
                      {/* Circle - z-10 so it appears above the connector line */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted
                            ? 'bg-[#008755] border-[#008755]'
                            : 'bg-white border-gray-300'
                        }`}
                        style={{ position: 'relative', zIndex: 10 }}
                      >
                        {isCompleted && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {/* Label */}
                      <span className={`text-[10px] md:text-[11px] mt-2 font-semibold text-center leading-tight ${
                        isCompleted ? 'text-[#008755]' : 'text-black'
                      }`}>
                        {step.label}
                      </span>
                      {/* Sub-label */}
                      <span className={`text-[9px] mt-0.5 text-center ${
                        isCompleted ? 'text-black' : 'text-black'
                      }`}>
                        {isCompleted && idx <= 1
                          ? fmtTimelineTime(order?.created_at, idx * 2)
                          : isCompleted
                            ? fmtTimelineTime(order?.created_at, idx * 30)
                            : t('text-pending')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}



          {/* Delivery Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ltr:md:divide-x rtl:md:divide-x-reverse md:divide-gray-200 border border-gray-150 rounded-xl p-5 bg-white ltr:text-left rtl:text-right font-body shadow-sm">
            <div className="flex flex-col">
              <h4 className="font-bold text-sm text-heading uppercase tracking-wide mb-3">{t('text-delivery-address')}</h4>
              <div className="flex items-start gap-2">
                <IoLocationOutline className="text-base text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs md:text-sm text-black font-medium leading-relaxed space-y-0.5">
                  {shippingAddress.name && <div className="font-bold text-heading mb-0.5">{shippingAddress.name}</div>}
                  {shippingAddress.lines.map((l: any, idx: number) => (
                    <div key={idx}>{l}</div>
                  ))}
                  {shippingAddress.phone && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-heading font-semibold">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {shippingAddress.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col ltr:md:pl-6 rtl:md:pr-6 pt-5 md:pt-0">
              <h4 className="font-bold text-sm text-heading uppercase tracking-wide mb-3">{t('text-delivery-method')}</h4>
              <div className="flex items-start gap-2">
                <TruckIcon className="text-lg text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs md:text-sm font-bold text-heading">{shippingMethod}</span>
                  <p className="text-[11px] md:text-xs text-black font-medium mt-1">
                    {t('text-estimated-delivery-prefix')} {estimatedDelivery}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items Table Card */}
          <div className="border border-gray-150 rounded-xl bg-white p-5 font-body ltr:text-left rtl:text-right shadow-sm">
            <h3 className="font-bold text-sm text-heading border-b border-gray-100 pb-3 mb-4 uppercase tracking-wider">
              {t('text-order-items')} ({items.length})
            </h3>
            
            <div className="hidden md:grid grid-cols-12 gap-4 pb-2.5 border-b border-gray-100 text-[10px] font-bold text-black uppercase tracking-wider">
              <div className="col-span-5">{t('text-product')}</div>
              <div className="col-span-2 text-center">{t('text-sku')}</div>
              <div className="col-span-2 text-center">{t('text-unit-price')}</div>
              <div className="col-span-1 text-center">{t('text-qty')}</div>
              <div className="col-span-2 ltr:text-right rtl:text-left">{t('text-total')}</div>
            </div>

            <div className="divide-y divide-gray-100">
              {items.map((it: any) => {
                const itemThumb = pickOrderItemThumb(it);
                const itemQty = Number(it.quantity ?? 1);
                const itemTotalVal = Number(it.total ?? it.unit_price * itemQty);
                const itemUnitVal = itemTotalVal / itemQty;

                return (
                  <div key={it.id} className="py-4 first:pt-4 last:pb-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Product Details (5 Cols) */}
                    <div className="md:col-span-5 flex gap-3 items-center">
                      <div className="w-14 h-14 rounded-lg border border-gray-150 overflow-hidden bg-gray-50 p-1 flex items-center justify-center flex-shrink-0">
                        {itemThumb ? (
                          <img src={itemThumb} alt="" className="object-contain max-h-full max-w-full" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[9px] text-gray-400 font-body">{t('text-no-image')}</div>
                        )}
                      </div>
                      <div className="min-w-0 ltr:text-left rtl:text-right">
                        <h4 className="text-xs md:text-sm font-bold text-heading truncate uppercase">{it.title || it.product_title}</h4>
                      </div>
                    </div>

                    {/* SKU (2 Cols) */}
                    <div className="md:col-span-2 ltr:text-left rtl:text-right md:text-center">
                      <span className="text-xs text-gray-400 md:hidden block uppercase tracking-wider font-semibold mb-0.5">{t('text-sku')}</span>
                      <span className="text-xs text-black font-medium">{it.variant?.sku || 'N/A'}</span>
                    </div>
                    
                    {/* Unit Price (2 Cols) */}
                    <div className="md:col-span-2 ltr:text-left rtl:text-right md:text-center">
                      <span className="text-xs text-gray-400 md:hidden block uppercase tracking-wider font-semibold mb-0.5">{t('text-unit-price')}</span>
                      <span className="text-sm font-semibold text-heading">{fmt(itemUnitVal, currency)}</span>
                    </div>

                    {/* Qty (1 Col) */}
                    <div className="md:col-span-1 ltr:text-left rtl:text-right md:text-center">
                      <span className="text-xs text-gray-400 md:hidden block uppercase tracking-wider font-semibold mb-0.5">{t('text-qty')}</span>
                      <span className="text-sm font-semibold text-heading">{itemQty}</span>
                    </div>

                    {/* Total (2 Cols) */}
                    <div className="md:col-span-2 ltr:text-left rtl:text-right md:ltr:text-right md:rtl:text-left">
                      <span className="text-xs text-gray-400 md:hidden block uppercase tracking-wider font-semibold mb-0.5">{t('text-total')}</span>
                      <span className="text-sm font-bold text-[#008755]">{fmt(itemTotalVal, currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error messages */}
          {payError && (
            <div className="w-full bg-red-50 border border-red-200 text-red-600 rounded-lg p-3.5 text-xs font-semibold flex items-center gap-2 font-body text-left">
              <span>⚠️</span> {payError}
            </div>
          )}
          {cancelError && (
            <div className="w-full bg-red-50 border border-red-200 text-red-600 rounded-lg p-3.5 text-xs font-semibold flex items-center gap-2 font-body text-left">
              <span>⚠️</span> {cancelError}
            </div>
          )}

          {/* Action buttons at the bottom */}
          <div className="flex gap-3 w-full justify-start mt-2 flex-wrap">
            <Link
              href="/"
              className="h-10 px-5 border border-gray-300 hover:bg-gray-50 text-heading font-bold text-xs md:text-sm rounded-lg transition duration-200 flex items-center justify-center gap-1.5 font-body bg-white"
            >
              <IoArrowBackOutline className="text-base transform rtl:rotate-180" />
              <span>{t('text-continue-shopping')}</span>
            </Link>

            {isPaymentPending && !isGenuinelyCancelled && (
              <button
                type="button"
                onClick={cancelOrder}
                disabled={paying || canceling}
                className="h-10 px-5 border border-red-300 hover:bg-red-50 text-red-500 font-bold text-xs md:text-sm rounded-lg transition duration-200 flex items-center justify-center gap-1.5 font-body bg-white"
              >
                <IoTrashOutline className="text-base" />
                <span>{canceling ? t('text-cancelling') : t('text-cancel-order')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right sidebar area (col-span-4) */}
        <div className="lg:col-span-4 space-y-4 w-full">

          {/* PRICE DETAILS Card */}
          <div className="border border-gray-150 rounded-xl bg-white p-5 ltr:text-left rtl:text-right font-body shadow-sm">
            <h3 className="font-bold text-sm text-heading border-b border-gray-100 pb-2.5 mb-3.5 uppercase tracking-wider font-body">
              {t('text-price-details')}
            </h3>

            <div className="space-y-3 text-xs md:text-sm text-heading font-medium">
              <div className="flex justify-between items-center">
                <span className="text-black font-normal">{t('text-subtotal')} ({items.length} item{items.length > 1 ? 's' : ''})</span>
                <span className="font-semibold text-heading">{fmt(subtotalAmount, currency)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-black font-normal">{t('text-delivery-charges')}</span>
                <span className={`font-semibold ${
                  shippingAmount === 0 ? 'text-[#008755] font-bold uppercase' : 'text-heading'
                }`}>
                  {shippingAmount === 0 ? t('text-free') : fmt(shippingAmount, currency)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-black font-normal">{t('text-vat')}</span>
                <span className="font-semibold text-heading">{fmt(taxAmount, currency)}</span>
              </div>

              <div className="border-t border-gray-150 pt-3 flex justify-between items-center font-bold text-sm md:text-base text-heading">
                <span>{t('text-total-amount')}</span>
                <span className="text-[#008755]">{fmt(totalAmount, currency)}</span>
              </div>
            </div>
          </div>

          {/* Cash On Delivery / Payment Method Card */}
          <div className={`border rounded-xl p-4 flex items-start gap-3 shadow-sm ${
            isGenuinelyCancelled
              ? 'bg-rose-50 border-rose-100'
              : paymentProvider === 'pp_system_default' || !paymentProvider
                ? 'bg-[#F4F9F6] border-[#E8F1EC]'
                : isPaymentPaid
                  ? 'bg-[#F4F9F6] border-[#E8F1EC]'
                  : 'bg-rose-50 border-rose-100'
          }`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isGenuinelyCancelled
                ? 'bg-rose-100'
                : 'bg-[#E8F5E9]'
            }`}>
              {paymentProvider === 'pp_system_default' || !paymentProvider ? (
                <IoWalletOutline className="text-lg text-[#008755]" />
              ) : (
                <IoCardOutline className="text-lg text-[#008755]" />
              )}
            </div>
            <div>
              <h4 className={`text-sm font-bold ${
                isGenuinelyCancelled ? 'text-rose-700' : 'text-[#008755]'
              }`}>
                {isGenuinelyCancelled
                  ? t('text-order-cancelled')
                  : displayPaymentMethod}
              </h4>
              <p className="text-[11px] text-black mt-0.5">
                {isGenuinelyCancelled
                  ? t('text-order-cancelled-desc')
                  : paymentProvider === 'pp_system_default' || !paymentProvider
                    ? t('text-payment-cod-desc')
                    : isPaymentPaid
                      ? t('text-payment-completed-short')
                      : t('text-payment-pending-retry')}
              </p>
            </div>
          </div>

          {/* Need Help Card */}
          <div className="border border-gray-150 rounded-xl bg-white p-5 ltr:text-left rtl:text-right font-body shadow-sm font-body">
            <h3 className="font-bold text-sm text-heading mb-1">{t('text-need-help')}</h3>
            <p className="text-[11px] text-black mb-4">{t('text-need-help-order')}</p>

            <a
              href="tel:+97146069999"
              className="w-full h-10 border border-[#E8F1EC] hover:bg-[#F4F9F6] text-[#008755] font-bold text-xs md:text-sm rounded-lg transition duration-200 flex items-center justify-center gap-2 font-body mb-4"
            >
              <IoHeadsetOutline className="text-base" />
              <span>{t('text-contact-support')}</span>
            </a>

            <div className="space-y-2.5 text-xs text-black">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span>support@dubaipolicstore.ae</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span>+97146069999</span>
              </div>
            </div>
          </div>

          {/* Safe & Secure Card */}
          <div className="border border-gray-150 rounded-xl bg-white p-4 font-body shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                <IoShieldCheckmarkOutline className="text-lg text-[#008755]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-heading">{t('text-safe-secure')}</h4>
                <p className="text-[11px] text-black mt-0.5">{t('text-safe-secure-desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
