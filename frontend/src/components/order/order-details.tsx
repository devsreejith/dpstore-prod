import { useOrderQuery } from '@framework/order/get-order';
import { formatPrice } from '@framework/product/use-price';
import { useRouter } from 'next/router';
import Button from '@components/ui/button';
import http from '@framework/utils/http';
import { useMemo, useState } from 'react';
import Link from '@components/ui/link';
import { ROUTES } from '@utils/routes';
import {
  IoArrowBackOutline,
  IoDownloadOutline,
  IoWalletOutline,
  IoLocationOutline,
  IoDocumentTextOutline,
  IoPhonePortraitOutline,
  IoCheckmarkCircle,
  IoWarningOutline,
  IoHeadsetOutline,
  IoShieldCheckmarkOutline,
  IoRefreshOutline,
  IoCloseCircleOutline,
  IoCardOutline,
  IoLockClosedOutline,
  IoThumbsUpOutline,
  IoGiftOutline,
  IoCalendarOutline,
  IoHelpCircleOutline
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

  if (isLoading) return <div className="py-10 text-center text-sm text-body">Loading order details...</div>;
  if (!order) return <div className="py-10 text-center text-sm text-red-600 font-medium">Order not found.</div>;

  const items = Array.isArray(order?.items) ? order.items : [];
  const currency = String(order?.currency_code ?? 'aed').toUpperCase();
  const paymentProvider =
    Array.isArray(order?.payment_collections) && order.payment_collections.length
      ? String(order.payment_collections[0]?.payment_sessions?.[0]?.provider_id ?? '')
      : '';
  const isCancelled =
    Boolean((order as any)?.canceled_at) || String((order as any)?.status ?? '').toLowerCase() === 'canceled' || String((order as any)?.status ?? '').toLowerCase() === 'cancelled';
  const paymentStatus = String((order as any)?.payment_status ?? '').toLowerCase();
  
  const isOnlinePayment = paymentProvider && paymentProvider !== 'pp_system_default';
  const capturedAmount =
    Array.isArray(order?.payment_collections) && order.payment_collections.length
      ? Number(order.payment_collections[0]?.captured_amount ?? 0)
      : 0;

  const isPaymentPaid = isOnlinePayment
    ? capturedAmount > 0
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
  const subtotalAmount = Number((order as any)?.subtotal ?? (order as any)?.item_subtotal ?? 0) || 0;
  const shippingAmount = Number((order as any)?.shipping_total ?? 0) || 0;
  const taxAmount = Number((order as any)?.tax_total ?? (order as any)?.taxes_total ?? 0) || 0;
  const totalAmount = Number((order as any)?.total ?? 0) || 0;

  const continuePayment = async () => {
    if (!paymentCollectionId) {
      setPayError('Online payment is not available for this order.');
      return;
    }
    setPayError(null);
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
      await http.post(`/store/orders/${orderId}/cancel`, {});
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
  const paymentMethodName = paymentProvider === 'pp_system_default' || !paymentProvider ? 'Cash On Delivery' : 'Online Payment Card';

  const originalSubtotal = subtotalAmount;
  const discountAmount = 0;

  return (
    <div className={`${className} bg-transparent min-h-screen pb-12 font-body`}>
      <Link href={ROUTES.ORDERS} className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-black transition gap-2 mb-5 font-body">
        <IoArrowBackOutline className="text-base" /> Back to Orders
      </Link>

      {isOnlinePayment && isPaymentPending && !isCancelled && (
        <div className="mb-5 font-body">
          <div className="bg-[#FEFBF7] border border-[#FFE8C5] rounded-md p-4 flex flex-col sm:flex-row justify-between items-center gap-3.5 font-body">
            <span className="text-xs md:text-sm text-heading font-medium">
              Pay online for a smooth doorstep experience
            </span>
            <Button
              type="button"
              onClick={continuePayment}
              loading={paying}
              disabled={paying}
              className="h-9 px-5 text-xs font-bold font-body uppercase bg-heading hover:bg-gray-600 text-white"
            >
              Pay {fmt(totalAmount, currency)}
            </Button>
          </div>
          {payError && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3.5 text-xs font-semibold mt-3.5 flex items-center gap-2">
              <span>⚠️</span> {payError}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-body">
        <div className="lg:col-span-8 space-y-4">
          {items.map((it: any) => {
            const itemThumb = pickOrderItemThumb(it);
            const itemPrice = fmt(it.unit_price, currency);

            return (
              <div key={it.id} className="border border-gray-200 rounded-md bg-white p-5 space-y-5">
                <div className="flex gap-4 items-start">
                  <div className="w-20 h-20 rounded border border-gray-150 overflow-hidden bg-white p-1.5 flex items-center justify-center flex-shrink-0">
                    <img src={itemThumb} alt="" className="object-contain max-h-full max-w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm md:text-base font-bold text-heading truncate">{it.title || it.product_title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-bold text-heading font-mono">{itemPrice}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="relative pl-7 border-l-2 border-dashed border-gray-200 space-y-6 ml-3 py-1">
                    <div className="relative">
                      <div className="absolute -left-[39px] top-0.5 w-5 h-5 rounded-full bg-green-500 border border-green-500 flex items-center justify-center text-white">
                        <IoCheckmarkCircle className="text-xs" />
                      </div>
                      <div>
                        <h4 className="text-xs md:text-sm font-bold text-heading">Order Confirmed</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Your order has been placed on {createdAt}</p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className={`absolute -left-[39px] top-0.5 w-5 h-5 rounded-full border-2 ${isShipped ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-300'} flex items-center justify-center`}>
                        {isShipped ? <IoCheckmarkCircle className="text-xs" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                      </div>
                      <div>
                        <h4 className={`text-xs md:text-sm font-bold ${isShipped ? 'text-heading' : 'text-gray-500'}`}>Shipped</h4>
                        {isShipped ? (
                          <p className="text-xs text-gray-500 mt-0.5">Item departed sorting facility.</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">Item has not shipped yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <div className={`absolute -left-[39px] top-0.5 w-5 h-5 rounded-full border-2 ${isOutForDelivery ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-300'} flex items-center justify-center`}>
                        {isOutForDelivery ? <IoCheckmarkCircle className="text-xs" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                      </div>
                      <div>
                        <h4 className={`text-xs md:text-sm font-bold ${isOutForDelivery ? 'text-heading' : 'text-gray-500'}`}>Out For Delivery</h4>
                        {isOutForDelivery ? (
                          <p className="text-xs text-gray-500 mt-0.5">Item is with carrier for delivery.</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">Item is not out for delivery yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <div className={`absolute -left-[39px] top-0.5 w-5 h-5 rounded-full border-2 ${isDelivered ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-300'} flex items-center justify-center`}>
                        {isDelivered ? <IoCheckmarkCircle className="text-xs" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                      </div>
                      <div>
                        <h4 className={`text-xs md:text-sm font-bold ${isDelivered ? 'text-heading' : 'text-gray-500'}`}>Delivered</h4>
                        {isDelivered ? (
                          <p className="text-xs text-gray-500 mt-0.5">Item delivered on {fmtDate((order as any)?.updated_at)}</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-0.5">Expected Delivery within 7-20 Days</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="text-xs text-gray-500 font-medium px-1">
            Delivery Executive details will be available once the order is out for delivery.
          </div>

          <div className="border border-gray-200 bg-white rounded-md p-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-3">
              {isPaymentPending && !isCancelled && (
                <Button
                  type="button"
                  variant="smoke"
                  className="h-10 px-5 !bg-white hover:!bg-gray-50 border border-gray-300 text-rose-600 font-bold text-xs uppercase"
                  onClick={cancelOrder}
                  loading={canceling}
                  disabled={canceling}
                >
                  Cancel Order
                </Button>
              )}
              {isDelivered && (
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="smoke"
                    className="h-10 px-5 !bg-white hover:!bg-gray-50 border border-gray-300 text-[#C7844B] hover:text-amber-800 font-bold text-xs uppercase"
                    onClick={() => alert('Returns & Exchanges are open! A support ticket has been created.')}
                  >
                    Return / Exchange
                  </Button>
                  <Button
                    type="button"
                    className="h-10 px-5 text-xs font-bold uppercase"
                    onClick={() => alert('Ratings & Reviews feature coming soon!')}
                  >
                    Rate Product
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="border border-gray-200 rounded-md bg-white p-5 relative">
            <h3 className="font-bold text-sm text-heading border-b border-gray-100 pb-2.5 mb-3.5 uppercase tracking-wider">
              Delivery details
            </h3>
            <div className="relative">
              <div className="text-sm font-bold text-heading">{shippingAddress.name || 'Recipient'}</div>
              <div className="text-xs md:text-sm text-gray-700 leading-relaxed mt-1">
                {shippingAddress.lines.join(', ')}
              </div>
              {shippingAddress.phone && (
                <div className="text-xs md:text-sm text-gray-800 font-semibold mt-1">
                  Phone: {shippingAddress.phone}
                </div>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-md bg-white p-5">
            <h3 className="font-bold text-sm text-heading border-b border-gray-100 pb-2.5 mb-3.5 uppercase tracking-wider font-body">
              Price details
            </h3>

            <div className="space-y-4 text-xs md:text-sm text-heading font-medium font-body">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-normal">Price ({items.length} item{items.length > 1 ? "s" : ""})</span>
                <span className="font-mono text-heading font-semibold">{fmt(subtotalAmount, currency)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-normal">Discount</span>
                <span className="text-[#1C5E39] font-mono font-semibold">AED 00.00</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-normal">Delivery Charges</span>
                <span className="text-[#1C5E39] uppercase font-bold text-10px">Free</span>
              </div>

              <div className="border-t border-gray-150 pt-4 flex justify-between items-center font-bold text-sm md:text-base text-heading">
                <span>Total Amount</span>
                <span className="font-mono">{fmt(totalAmount, currency)}</span>
              </div>
            </div>

            <div className={`rounded p-2.5 mt-4 text-xs font-bold text-center border ${
              isPaymentPaid && paymentProvider !== 'pp_system_default'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-amber-50 border-amber-100 text-[#D97706]'
            }`}>
              {isPaymentPaid && paymentProvider !== 'pp_system_default'
                ? `Paid By ${paymentMethodName}`
                : (paymentProvider === 'pp_system_default' || !paymentProvider
                    ? 'Cash On Delivery'
                    : 'Pending Payment')}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 mt-12 pt-8 pb-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div className="flex flex-col items-center p-2">
          <IoShieldCheckmarkOutline className="text-3xl text-heading mb-2.5" />
          <h5 className="text-sm font-semibold text-heading font-body">Secure Payments</h5>
          <p className="text-xs text-gray-500 font-semibold mt-1">100% secure payment</p>
        </div>
        <div className="flex flex-col items-center p-2">
          <IoRefreshOutline className="text-3xl text-heading mb-2.5" />
          <h5 className="text-sm font-semibold text-heading font-body">Easy Returns</h5>
          <p className="text-xs text-gray-500 font-semibold mt-1">7 days return policy</p>
        </div>
        <div className="flex flex-col items-center p-2">
          <TruckIcon className="text-3xl text-heading mb-2.5" />
          <h5 className="text-sm font-semibold text-heading font-body">Fast Delivery</h5>
          <p className="text-xs text-gray-500 font-semibold mt-1">Quick & reliable delivery</p>
        </div>
        <div className="flex flex-col items-center p-2">
          <IoHeadsetOutline className="text-3xl text-heading mb-2.5" />
          <h5 className="text-sm font-semibold text-heading font-body">Customer Support</h5>
          <p className="text-xs text-gray-500 font-semibold mt-1">24/7 customer support</p>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
