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
    query: { id },
  } = useRouter();
  const router = useRouter();
  const { data: order, isLoading } = useOrderQuery(id?.toString()!);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [activePaymentTab, setActivePaymentTab] = useState<'RECOMMENDED' | 'SAVED' | 'CARDS' | 'COD' | 'GIFT' | 'UPI' | 'EMI'>('CARDS');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.match(/.{1,4}/g)?.join(' ') || '';
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      setCardExpiry(`${value.slice(0, 2)}/${value.slice(2, 4)}`);
    } else {
      setCardExpiry(value);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCardCvv(value.substring(0, 3));
  };

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
  const isPaymentPaid = paymentStatus === 'captured' || paymentStatus === 'paid';
  const isPaymentPending = !isPaymentPaid && !isCancelled;

  // Premium status label styling
  let paymentLabel = 'Payment Pending';
  let paymentLabelColor = 'text-[#D97706]';
  if (isCancelled) {
    paymentLabel = 'Cancelled';
    paymentLabelColor = 'text-red-600';
  } else if (isPaymentPaid) {
    paymentLabel = 'Paid';
    paymentLabelColor = 'text-green-600';
  }

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

  const continuePayment = () => {
    if (!paymentCollectionId) {
      setPayError('Online payment is not available for this order.');
      return;
    }
    setPayError(null);
    setShowPaymentScreen(true);
  };

  const submitDummyPayment = async () => {
    setPayError(null);
    setPaying(true);
    try {
      let providerId = paymentProvider;
      if (!providerId) {
        try {
          const regionId = String((order as any)?.region_id ?? '').trim();
          if (regionId) {
            const resProviders = await http.get(`/store/payment-providers`, {
              params: { region_id: regionId },
            });
            const providers = Array.isArray(resProviders?.data?.payment_providers) ? resProviders.data.payment_providers : [];
            providerId = providers?.[0]?.id || 'pp_system_default';
          } else {
            providerId = 'pp_system_default';
          }
        } catch {
          providerId = 'pp_system_default';
        }
      }

      // 1. Create the payment session on the backend
      const res = await http.post(`/store/payment-collections/${paymentCollectionId}/payment-sessions`, {
        provider_id: providerId,
        data: typeof window !== 'undefined' ? { return_url: window.location.href } : {},
      });
      const pc = (res as any)?.data?.payment_collection ?? (res as any)?.data?.paymentCollection ?? (res as any)?.data;
      const sessions = Array.isArray(pc?.payment_sessions) ? pc.payment_sessions : [];
      const session = sessions?.[0];
      if (!session?.id) {
        throw new Error('Failed to initialize payment session.');
      }

      // 2. Authorize the payment session on the backend (completes/captures the payment!)
      await http.post(`/store/payment-collections/${paymentCollectionId}/authorize`, {});

      // 3. Close payment screen and reload page to show order as PAID!
      setShowPaymentScreen(false);
      router.reload();
    } catch (e: any) {
      const msg = String(e?.response?.data?.message ?? e?.message ?? 'Failed to complete payment');
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

  const originalSubtotal = Math.round(subtotalAmount * 1.25);
  const discountAmount = originalSubtotal - subtotalAmount;

  if (showPaymentScreen) {
    const paymentOptions = [
      {
        id: 'RECOMMENDED' as const,
        label: 'Recommended for You',
        icon: <IoThumbsUpOutline className="text-lg" />,
        subtext: 'Fastest & most secure ways to pay'
      },
      {
        id: 'SAVED' as const,
        label: 'Saved Payment Options',
        icon: <IoRefreshOutline className="text-lg" />,
        subtext: 'Manage your saved cards'
      },
      {
        id: 'CARDS' as const,
        label: 'Credit / Debit / ATM Card',
        icon: <IoCardOutline className="text-lg" />,
        subtext: 'Add and secure cards. Get upto 5% cashback'
      },
      {
        id: 'COD' as const,
        label: 'Cash on Delivery',
        icon: <IoWalletOutline className="text-lg" />,
        subtext: 'Pay cash on doorstep. AED 9 fee applies'
      },
      {
        id: 'GIFT' as const,
        label: 'Have a Dubai Police Gift Card?',
        icon: <IoGiftOutline className="text-lg" />,
        subtext: 'Redeem gift cards for purchase'
      },
      {
        id: 'UPI' as const,
        label: 'UPI',
        icon: <span className="text-[10px] border border-gray-400 px-1 rounded font-bold font-mono select-none">UPI</span>,
        subtext: 'Instant payment via GPay, PhonePe etc'
      },
      {
        id: 'EMI' as const,
        label: 'EMI',
        icon: <IoCalendarOutline className="text-lg" />,
        subtext: 'Easy monthly installment plans'
      },
    ];

    const platformFee = totalAmount > 20 ? 8 : 0;
    const currentFee = activePaymentTab === 'COD' ? 9 : 0;
    const couponDiscount = totalAmount > 50 ? 16 : 0;

    const mrp = Math.round((totalAmount + 50) * 1.5);
    const mrpDiscount = mrp + platformFee - totalAmount - couponDiscount;
    const finalAmount = totalAmount + currentFee;

    return (
      <div className={`${className} bg-transparent min-h-screen pb-12 font-body`}>
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-6 font-body">
          <button
            onClick={() => setShowPaymentScreen(false)}
            className="flex items-center gap-2.5 text-lg font-bold text-heading font-body hover:text-black transition"
          >
            <IoArrowBackOutline className="text-xl" /> Complete Payment
          </button>
          <span className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider font-body">
            <IoLockClosedOutline className="text-base text-green-600" /> 100% Secure
          </span>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-body">
          {/* Left Navigation Tabs */}
          <div className="lg:col-span-4 border border-gray-200 bg-white rounded-xl overflow-hidden font-body">
            <div className="flex flex-col">
              {paymentOptions.map((opt) => {
                const isActive = activePaymentTab === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setActivePaymentTab(opt.id);
                    }}
                    className={`w-full text-left p-4 flex gap-3.5 border-b border-gray-100 last:border-0 transition duration-150 ${
                      isActive
                        ? 'bg-white border-l-4 border-l-[#fbbf24] text-heading font-bold'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <div className="mt-0.5 text-gray-500">{opt.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        {opt.label}
                      </div>
                      {opt.id === 'CARDS' ? (
                        <div className="mt-1">
                          <p className="text-[11px] text-gray-400 font-normal">Add and secure cards</p>
                          <p className="text-[11px] text-emerald-600 font-semibold">Get upto 5% cashback • 2 offers available</p>
                        </div>
                      ) : (
                        opt.subtext && (
                          <p className="text-[11px] text-gray-400 font-normal mt-0.5">{opt.subtext}</p>
                        )
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle Content Panel */}
          <div className="lg:col-span-4 border border-gray-200 bg-white rounded-xl p-5 min-h-[360px] flex flex-col justify-between font-body">
            {activePaymentTab === 'RECOMMENDED' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-heading">Recommended Payment Options</h4>
                <p className="text-xs text-gray-500 leading-relaxed font-normal">
                  Select one of our popular secure payment options to complete your transaction instantly.
                </p>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setActivePaymentTab('CARDS')}
                    className="w-full py-2.5 px-3 border border-gray-200 hover:border-heading rounded-lg flex items-center justify-between text-xs font-semibold text-heading"
                  >
                    <span>Credit / Debit / ATM Card</span>
                    <span className="text-[10px] text-emerald-600 font-bold">5% Cashback</span>
                  </button>
                  <button
                    onClick={() => setActivePaymentTab('UPI')}
                    className="w-full py-2.5 px-3 border border-gray-200 hover:border-heading rounded-lg flex items-center justify-between text-xs font-semibold text-heading"
                  >
                    <span>UPI (Google Pay / Paytm)</span>
                    <span className="text-[10px] text-gray-400">Instant</span>
                  </button>
                  <button
                    onClick={() => setActivePaymentTab('COD')}
                    className="w-full py-2.5 px-3 border border-gray-200 hover:border-heading rounded-lg flex items-center justify-between text-xs font-semibold text-heading"
                  >
                    <span>Cash on Delivery</span>
                    <span className="text-[10px] text-gray-400">COD Fee Applies</span>
                  </button>
                </div>
              </div>
            )}

            {activePaymentTab === 'SAVED' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-heading">Saved Payment Options</h4>
                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100/50">
                    <input type="radio" name="saved_card" defaultChecked className="text-heading focus:ring-heading" />
                    <div className="flex-1 text-xs font-normal">
                      <p className="font-bold text-heading">Visa Debit Card (•••• 4242)</p>
                      <p className="text-gray-400 mt-0.5">Expires 12/28 | Cardholder: {shippingAddress.name}</p>
                    </div>
                  </label>
                  <div className="w-1/2">
                    <label className="block text-[10px] font-bold text-heading uppercase mb-1">Enter CVV</label>
                    <input
                      type="password"
                      maxLength={3}
                      placeholder="•••"
                      className="w-full h-9 text-center border border-gray-300 rounded focus:border-heading outline-none font-semibold text-sm"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <Button
                    onClick={submitDummyPayment}
                    loading={paying}
                    className="w-full h-11 bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 font-bold text-sm rounded-md transition duration-150"
                  >
                    Pay {fmt(finalAmount, currency)}
                  </Button>
                </div>
              </div>
            )}

            {activePaymentTab === 'CARDS' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-heading">Credit / Debit / ATM Card</h4>
                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-heading uppercase mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full h-10 px-3 border border-gray-300 rounded focus:border-heading outline-none font-medium uppercase text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-heading uppercase mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4000 1234 5678 9010"
                      className="w-full h-10 px-3 border border-gray-300 rounded focus:border-heading outline-none font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-heading uppercase mb-1">Expiration</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full h-10 px-3 border border-gray-300 rounded focus:border-heading outline-none font-medium text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-heading uppercase mb-1">CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={handleCvvChange}
                        placeholder="•••"
                        className="w-full h-10 px-3 border border-gray-300 rounded focus:border-heading outline-none font-medium text-center"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <Button
                    onClick={submitDummyPayment}
                    disabled={paying || !cardName || cardNumber.length < 19 || cardExpiry.length < 5 || cardCvv.length < 3}
                    loading={paying}
                    className="w-full h-11 bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 font-bold text-sm rounded-md transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Pay {fmt(finalAmount, currency)}
                  </Button>
                </div>
              </div>
            )}

            {activePaymentTab === 'COD' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-heading">Cash on Delivery</h4>
                  <p className="text-xs text-gray-500 leading-relaxed font-normal">
                    Due to handling costs, a nominal fee of AED 9 will be charged for orders placed using this option. Avoid this fee by paying online now.
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 font-normal">
                  <Button
                    onClick={async () => {
                      setPaying(true);
                      setTimeout(() => {
                        setPaying(false);
                        setShowPaymentScreen(false);
                        router.reload();
                      }, 1000);
                    }}
                    loading={paying}
                    className="w-full h-11 bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 font-bold text-sm rounded-md transition duration-150"
                  >
                    Place Order
                  </Button>
                </div>
              </div>
            )}

            {activePaymentTab === 'GIFT' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-heading">Dubai Police Gift Card</h4>
                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-heading uppercase mb-1">Gift Card Number</label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="1234-5678-9012-3456"
                      className="w-full h-10 px-3 border border-gray-300 rounded focus:border-heading outline-none font-medium text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-heading uppercase mb-1">Card PIN</label>
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="••••••"
                      className="w-full h-10 px-3 border border-gray-300 rounded focus:border-heading outline-none font-medium text-center"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <Button
                    onClick={submitDummyPayment}
                    loading={paying}
                    className="w-full h-11 bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 font-bold text-sm rounded-md transition duration-150"
                  >
                    Apply & Pay {fmt(finalAmount, currency)}
                  </Button>
                </div>
              </div>
            )}

            {activePaymentTab === 'UPI' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-heading">UPI Payment</h4>
                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-heading uppercase mb-1">Enter UPI ID</label>
                    <input
                      type="text"
                      placeholder="username@bank"
                      className="w-full h-10 px-3 border border-gray-300 rounded focus:border-heading outline-none font-medium text-left"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Pay instantly using Google Pay, PhonePe or BHIM UPI.</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <Button
                    onClick={submitDummyPayment}
                    loading={paying}
                    className="w-full h-11 bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 font-bold text-sm rounded-md transition duration-150"
                  >
                    Pay {fmt(finalAmount, currency)}
                  </Button>
                </div>
              </div>
            )}

            {activePaymentTab === 'EMI' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-heading">EMI (Easy Monthly Installments)</h4>
                  <div className="space-y-3 pt-1 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-heading uppercase mb-1">Select Bank</label>
                      <select className="w-full h-10 px-2 border border-gray-300 rounded focus:border-heading outline-none font-medium bg-white text-left">
                        <option>Emirates NBD</option>
                        <option>Abu Dhabi Commercial Bank (ADCB)</option>
                        <option>Dubai Islamic Bank</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-heading uppercase mb-1">Select Plan</label>
                      <select className="w-full h-10 px-2 border border-gray-300 rounded focus:border-heading outline-none font-medium bg-white text-left">
                        <option>3 Months @ 0% Interest (AED {Math.round(finalAmount / 3)}/mo)</option>
                        <option>6 Months @ 0.5% Interest (AED {Math.round(finalAmount * 1.03 / 6)}/mo)</option>
                        <option>12 Months @ 1% Interest (AED {Math.round(finalAmount * 1.12 / 12)}/mo)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 font-normal">
                  <Button
                    onClick={submitDummyPayment}
                    loading={paying}
                    className="w-full h-11 bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 font-bold text-sm rounded-md transition duration-150"
                  >
                    Pay EMI
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Price Details */}
          <div className="lg:col-span-4 space-y-4 font-body">
            <div className="border border-gray-200 rounded-xl bg-white p-5">
              <h3 className="font-bold text-sm text-heading border-b border-gray-100 pb-2.5 mb-3.5 uppercase tracking-wider">
                Price details
              </h3>

              <div className="space-y-3.5 text-xs md:text-sm text-heading font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">MRP (incl. of all taxes)</span>
                  <span className="font-mono">{fmt(mrp, currency)}</span>
                </div>

                {/* Fees Section */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between items-center font-semibold text-gray-700">
                    <span>Fees</span>
                    <span className="text-xs">▲</span>
                  </div>
                  {currentFee > 0 && (
                    <div className="flex justify-between items-center pl-3 text-xs text-gray-500">
                      <span>Payment Handling Fee</span>
                      <span className="font-mono">{fmt(currentFee, currency)}</span>
                    </div>
                  )}
                  {platformFee > 0 && (
                    <div className="flex justify-between items-center pl-3 text-xs text-gray-500">
                      <span>Platform Fee</span>
                      <span className="font-mono">{fmt(platformFee, currency)}</span>
                    </div>
                  )}
                </div>

                {/* Discounts Section */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between items-center font-semibold text-gray-700">
                    <span>Discounts</span>
                    <span className="text-xs">▲</span>
                  </div>
                  {mrpDiscount > 0 && (
                    <div className="flex justify-between items-center pl-3 text-xs text-gray-500">
                      <span>MRP Discount</span>
                      <span className="text-emerald-600 font-mono">-{fmt(mrpDiscount, currency)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between items-center pl-3 text-xs text-gray-500">
                      <span>Coupons for you</span>
                      <span className="text-emerald-600 font-mono">-{fmt(couponDiscount, currency)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-150 pt-3 flex justify-between items-center font-bold text-base text-heading">
                  <span>Total Amount</span>
                  <span className="font-mono text-[#3F51B5]">{fmt(finalAmount, currency)}</span>
                </div>
              </div>

              {/* 5% Cashback green box */}
              <div className="bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl p-3 mt-5 flex justify-between items-center text-xs text-[#2E7D32]">
                <div className="font-semibold leading-relaxed">
                  <p className="font-bold text-[#1B5E20] text-sm">5% Cashback</p>
                  <p className="text-gray-600">Claim now with payment offers</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold font-mono text-[9px] text-gray-500">G</div>
                  <div className="w-5 h-5 rounded-full bg-[#3F51B5] text-white flex items-center justify-center font-bold font-mono text-[9px]">P</div>
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[9px] text-gray-600">+3</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} bg-transparent min-h-screen pb-12 font-body`}>
      <Link href={ROUTES.ORDERS} className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-black transition gap-2 mb-5 font-body">
        <IoArrowBackOutline className="text-base" /> Back to Orders
      </Link>

      {isPaymentPending && !isCancelled && (
        <div className="bg-[#FEFBF7] border border-[#FFE8C5] rounded-md p-4 flex flex-col sm:flex-row justify-between items-center gap-3.5 mb-5 font-body">
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-body">
        <div className="lg:col-span-8 space-y-4">
          {items.map((it: any) => {
            const itemThumb = pickOrderItemThumb(it);
            const itemOriginalPrice = fmt(it.unit_price * 1.25, currency);
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
                      <span className="text-xs text-gray-500 line-through font-mono">{itemOriginalPrice}</span>
                      <span className="text-xs text-emerald-600 font-semibold">20% off</span>
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
            <h3 className="font-bold text-sm text-heading border-b border-gray-100 pb-2.5 mb-3.5 uppercase tracking-wider">
              Price details
            </h3>

            <div className="space-y-3.5 text-xs md:text-sm text-heading font-medium">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Listing Price</span>
                <span className="line-through text-gray-400 font-mono">{fmt(originalSubtotal, currency)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Special Price</span>
                <span className="font-mono text-heading">{fmt(subtotalAmount, currency)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total fees</span>
                <span className="text-emerald-600 uppercase font-bold text-xs">Free</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Other discount</span>
                <span className="text-emerald-600 font-semibold font-mono">-{fmt(discountAmount, currency)}</span>
              </div>

              <div className="border-t border-gray-150 pt-3 flex justify-between items-center font-bold text-base text-heading">
                <span>Total amount</span>
                <span className="font-mono">{fmt(totalAmount, currency)}</span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded p-2.5 mt-4 text-xs text-emerald-700 font-bold text-center">
              Paid By {paymentMethodName}
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
