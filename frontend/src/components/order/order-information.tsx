import OrderDetails from '@components/order/order-details';
import Loader from '@components/ui/loader';
import { useOrderQuery } from '@framework/order/get-order';
import { useRouter } from 'next/router';
import usePrice, { formatPrice } from '@framework/product/use-price';
import { useTranslation } from 'next-i18next';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import http from '@framework/utils/http';
import {
  IoArrowBackOutline,
  IoDocumentTextOutline,
  IoWalletOutline,
  IoAlertCircleOutline,
  IoLockClosedOutline,
  IoTrashOutline,
  IoShieldCheckmarkOutline,
  IoCalendarOutline,
  IoMailOutline
} from 'react-icons/io5';

const fmt = (amount: any, currencyCode: any = 'AED') => {
  const n = typeof amount === 'number' ? amount : Number(amount);
  const code = String(currencyCode || 'AED').toUpperCase();
  if (!Number.isFinite(n)) return '';
  return formatPrice({ amount: n, currencyCode: code, locale: 'en' });
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

const isPaymentSuccessful = (collection: any) => {
  console.log(
    "NGENIUS_COLLECTION",
    JSON.stringify(collection, null, 2)
  );
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
    
    return true; // For other providers, rely on Medusa status
  }
  
  return false;
};

export default function OrderInformation() {
  const {
    query: { id, cart_id, ref },
    isReady
  } = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationDone, setVerificationDone] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const prepareForPaymentVerification = () => {
    // Reset to the loader before leaving the page so a restored browser snapshot
    // does not briefly show the previous failed/cancelled state on return.
    setPayError(null);
    setCancelError(null);
    setVerificationDone(false);
    setVerifying(false);
    setVerificationFailed(false);
  };

  const cancelOrder = async () => {
    if (isCancelled) return;
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelError(null);
    setCanceling(true);
    try {
      if (!data?.id) throw new Error('Order not found');
      await http.post(`/store/orders/${data.id}/cancel`, { email: data?.email });
      refetch();
    } catch (e: any) {
      const msg = String(e?.response?.data?.message ?? e?.message ?? 'Failed to cancel order');
      setCancelError(msg);
    } finally {
      setCanceling(false);
    }
  };

  const { t } = useTranslation('common');
  const orderIdentifier = (id || cart_id || ref)?.toString()!;
  const { data, isLoading, refetch } = useOrderQuery(orderIdentifier);
  const totalAmount = Number(data?.total ?? 0) || 0;
  const shippingAmount = Number(data?.shipping_total ?? 0) || 0;
  const subtotalAmount = totalAmount - shippingAmount;
  const discountAmount = 0; // Hide all discount tags, badges, and rows
  const totalItemsCount = data?.items?.reduce((acc: number, item: any) => acc + (item.quantity ?? 0), 0) ?? 0;

  const currency = String(data?.currency_code || 'AED').toUpperCase();
  const subtotal = fmt(subtotalAmount, currency);
  const discount = fmt(discountAmount, currency);
  const shipping = fmt(shippingAmount, currency);
  const total = fmt(totalAmount, currency);

  const paymentCollectionId = useMemo(() => {
    const fromArray =
      Array.isArray(data?.payment_collections) && data.payment_collections.length
        ? String(data.payment_collections[0]?.id ?? '').trim()
        : '';
    const direct = String((data as any)?.payment_collection_id ?? '').trim();
    return fromArray || direct || '';
  }, [data]);

  const paymentProvider = useMemo(() => {
    if (!Array.isArray(data?.payment_collections) || !data.payment_collections.length) {
      return '';
    }
    const col = data.payment_collections[0];
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
  }, [data]);  const paymentMethodName =
    paymentProvider === 'pp_system_default' || !paymentProvider
      ? 'Cash on Delivery'
      : 'Online';

  const isOnlinePayment = paymentProvider && paymentProvider !== 'pp_system_default';
  
  const paymentCollection = Array.isArray(data?.payment_collections) && data.payment_collections.length
    ? data.payment_collections[0]
    : null;

  const capturedAmount = paymentCollection ? Number(paymentCollection.captured_amount ?? 0) : 0;
  const paymentCollectionStatus = String(paymentCollection?.status ?? '').toLowerCase();
  const paymentStatus = String(data?.payment_status ?? '').toLowerCase();

  const isPaid = isOnlinePayment
    ? isPaymentSuccessful(paymentCollection)
    : (paymentStatus === 'captured' || paymentStatus === 'paid' || paymentStatus === 'authorized');

  const isCancelled =
    Boolean(data?.canceled_at) ||
    String(data?.status ?? '').toLowerCase() === 'canceled' ||
    String(data?.status ?? '').toLowerCase() === 'cancelled';

  // For online payments, isPaid (from isPaymentSuccessful) is the single source of truth.
  // No dependency on verificationFailed — only the gateway result matters.
  const isPaymentFailed = isOnlinePayment && !isPaid;

  useEffect(() => {
    if (!isReady || !orderIdentifier) return;
    if (isLoading) return;
    if (!data) {
      setVerificationFailed(true);
      setVerificationDone(true);
      return;
    }

    const isAlreadyPaid = isOnlinePayment
      ? isPaymentSuccessful(paymentCollection)
      : (capturedAmount > 0 || paymentCollectionStatus === 'captured');
    const shouldSkip = isAlreadyPaid;

    if (!paymentCollectionId || !isOnlinePayment) {
      setVerificationDone(true);
      return;
    }

    if (shouldSkip) {
      setVerificationDone(true);
      return;
    }

    if (verificationDone || verifying) {
      return;
    }

    const verifyPayment = async () => {
      setVerifying(true);
      try {
        await http.post(`/store/payment-collections/${paymentCollectionId}/authorize`, {}, { timeout: 8000 });
        await refetch();
        setVerificationDone(true);
      } catch (e: any) {
        console.error("Payment verification failed:", e);
        // Always refetch order data so isPaid reflects the latest gateway state
        try { await refetch(); } catch (_) {}
        setVerificationFailed(true);
        setVerificationDone(true);
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [data, paymentCollectionId, isOnlinePayment, capturedAmount, verificationDone, verifying, refetch, isCancelled, paymentCollectionStatus, isReady, orderIdentifier]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      prepareForPaymentVerification();
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);



  if (!isReady || isLoading || !data || verifying || (isOnlinePayment && !verificationDone)) {
    return (
      <Loader
        size="large"
        text="Verifying payment status..."
        description="Please wait while we confirm your payment transaction. Do not refresh or close this page."
      />
    );
  }

  const getFriendlyOrderNumber = (o: any) => {
    if (o?.metadata?.order_number) {
      return String(o.metadata.order_number);
    }
    const orderDate = o?.created_at ? new Date(o.created_at) : new Date();
    const yyVal = String(orderDate.getFullYear()).slice(-2);
    const displayIdStrVal = String(o?.display_id ?? '1').padStart(4, '0');
    return `ORD-OL${yyVal}-${displayIdStrVal}`;
  };

  const formattedOrderNumber = getFriendlyOrderNumber(data);

  const continuePayment = async () => {
    if (!paymentCollectionId) {
      setPayError('Online payment is not available for this order.');
      return;
    }
    prepareForPaymentVerification();
    setPaying(true);
    try {
      let providerId = paymentProvider;
      if (!providerId || providerId === 'pp_system_default') {
        providerId = 'pp_ngenius_ngenius';
      }

      // 1. Create the payment session on the backend
      const res = await http.post(`/store/payment-collections/${paymentCollectionId}/payment-sessions`, {
        provider_id: providerId,
        data: {
          order_id: data.id
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

  return (
    <div className="w-full py-2">
      {showDetails ? (
        <div className="w-full">
          <OrderDetails className="p-0" />
        </div>
      ) : isPaymentFailed ? (
          /* Payment Failed View */
          <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
            <div className="w-full bg-white border border-gray-150 rounded-2xl p-8 md:p-12 shadow-sm flex flex-col items-center">
              {/* Failed Icon */}
              <div className="relative mb-8 flex items-center justify-center" style={{ width: 96, height: 96 }}>
                <div className="absolute inset-0 border-2 border-dashed border-[#FCA5A5] rounded-full" style={{ width: 96, height: 96 }}></div>
                <span className="absolute" style={{ top: -4, left: 8, width: 6, height: 6, borderRadius: '50%', background: '#B91C1C' }}></span>
                <span className="absolute" style={{ bottom: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: '#B91C1C' }}></span>
                <span className="absolute" style={{ top: 12, right: -6, width: 5, height: 5, borderRadius: '50%', background: '#B91C1C' }}></span>
                <span className="absolute" style={{ bottom: 16, left: -4, width: 4, height: 4, borderRadius: '50%', background: '#B91C1C' }}></span>
                <div className="w-16 h-16 rounded-full bg-[#A52A2A] flex items-center justify-center shadow-md relative z-10">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-[#A52A2A] font-body mb-2 text-center">
                Payment Failed
              </h1>
              <p className="text-sm text-gray-600 font-body text-center max-w-md leading-relaxed">
                We couldn&apos;t process your payment.
              </p>
              <p className="text-sm text-gray-600 font-body mb-8 text-center max-w-md">
                Please try again or choose another payment method.
              </p>

              {/* What happened? Info Box */}
              <div className="w-full bg-[#FFF5F5] border border-[#FEE2E2] rounded-xl p-5 mb-8 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FEE2E2] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#A52A2A] font-bold text-lg">!</span>
                </div>
                <div className="flex flex-col text-left">
                  <h4 className="text-sm font-bold text-heading mb-1">What happened?</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Your payment was not completed. No amount has been deducted from your account.
                  </p>
                </div>
              </div>

              {payError && (
                <div className="w-full bg-rose-50 border border-rose-100 rounded-xl p-3.5 mb-5 flex items-center gap-2.5 text-xs md:text-sm text-rose-700 font-semibold font-body text-left">
                  <span>⚠️ {payError}</span>
                </div>
              )}

              {/* Action Buttons - side by side */}
              <div className="flex flex-col sm:flex-row gap-4 w-full mb-4">
                <button
                  type="button"
                  onClick={continuePayment}
                  disabled={paying || canceling}
                  className="flex-1 h-12 border-2 border-[#A52A2A] hover:bg-[#FFF5F5] text-[#A52A2A] font-bold text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 font-body"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  {paying ? 'Processing...' : 'Try Again'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="flex-1 h-12 bg-[#A52A2A] hover:bg-[#8B0000] text-white font-bold text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 font-body"
                >
                  <IoWalletOutline className="text-lg" />
                  Change Payment Method
                </button>
              </div>

              {cancelError && (
                <div className="w-full bg-rose-50 border border-rose-100 rounded-xl p-3.5 mb-3 flex items-center gap-2.5 text-xs text-rose-700 font-semibold font-body text-left">
                  <span>⚠️ {cancelError}</span>
                </div>
              )}
            </div>

            {/* Safe & Secure Footer */}
            <div className="flex flex-col items-center mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px w-16 bg-gray-200"></div>
                <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                  <IoShieldCheckmarkOutline className="text-lg text-[#008755]" />
                </div>
                <div className="h-px w-16 bg-gray-200"></div>
              </div>
              <p className="text-xs text-black font-body text-center">
                Safe and secure payments. 100% authentic products.
              </p>
            </div>
          </div>
        ) : (
          /* Payment Success / COD Success View */
          <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
            <div className="w-full bg-white border border-gray-150 rounded-2xl p-8 md:p-12 shadow-sm flex flex-col items-center">
              {/* Success Icon */}
              {isCancelled ? (
                <div className="relative mb-8 flex items-center justify-center" style={{ width: 96, height: 96 }}>
                  <div className="absolute inset-0 border-2 border-dashed border-rose-200 rounded-full" style={{ width: 96, height: 96 }}></div>
                  <div className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center shadow-md relative z-10">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="relative mb-8 flex items-center justify-center" style={{ width: 96, height: 96 }}>
                  <div className="absolute inset-0 border-2 border-dashed border-[#A7D7C5] rounded-full" style={{ width: 96, height: 96 }}></div>
                  <span className="absolute" style={{ top: -4, left: 8, width: 6, height: 6, borderRadius: '50%', background: '#008755' }}></span>
                  <span className="absolute" style={{ bottom: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: '#A7D7C5' }}></span>
                  <span className="absolute" style={{ top: 12, right: -6, width: 5, height: 5, borderRadius: '50%', background: '#008755' }}></span>
                  <span className="absolute" style={{ bottom: 16, left: -4, width: 4, height: 4, borderRadius: '50%', background: '#A7D7C5' }}></span>
                  <div className="w-16 h-16 rounded-full bg-[#008755] flex items-center justify-center shadow-md relative z-10">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              <h1 className="text-2xl md:text-3xl font-bold text-[#005844] font-body mb-3 text-center">
                {isCancelled
                  ? "Order Cancelled"
                  : (!isOnlinePayment ? "Order Placed Successfully!" : "Payment Successful!")}
              </h1>
              
              {isCancelled ? (
                <div className="text-sm text-gray-600 font-body mb-8 text-center max-w-md leading-relaxed">
                  This order has been cancelled.
                </div>
              ) : !isOnlinePayment ? (
                <div className="text-sm md:text-base text-gray-700 font-body mb-8 text-center max-w-lg leading-relaxed flex flex-col gap-1.5">
                  <p>
                    Your order has been placed successfully on <span className="font-bold text-[#008755]">Cash on Delivery</span>.
                  </p>
                  <p className="text-gray-500 text-sm">
                    You will pay in cash when your order is delivered.
                  </p>
                </div>
              ) : (
                <div className="text-sm md:text-base text-gray-700 font-body mb-8 text-center max-w-lg leading-relaxed flex flex-col gap-1.5">
                  <p>Your payment has been completed successfully.</p>
                  <p className="text-gray-500 text-sm">Thank you for your order.</p>
                </div>
              )}

              {/* Email Confirmation */}
              {(isOnlinePayment || isCancelled) && (
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <IoMailOutline className="text-xl text-gray-500" />
                  </div>
                  <div className="text-sm text-black font-body">
                    <span>{isCancelled ? "A cancellation confirmation has been sent to" : "A confirmation email has been sent to"}</span>
                    <br />
                    <span className="font-bold text-heading">{data?.email}</span>
                  </div>
                </div>
              )}

              {/* Divider for COD */}
              {!isOnlinePayment && !isCancelled && (
                <div className="w-full max-w-xl h-px bg-gray-100 mb-8"></div>
              )}

              {/* Action Buttons - side by side */}
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="flex-1 h-12 border border-[#005844] hover:bg-[#F4F9F6] text-[#005844] font-bold text-sm rounded-lg transition duration-200 flex items-center justify-center gap-2 font-body"
                >
                  <IoDocumentTextOutline className="text-lg" />
                  View Order Details
                </button>
                <Link
                  href="/"
                  className="flex-1 h-12 bg-[#005844] hover:bg-[#008755] text-white font-bold text-sm rounded-lg transition duration-200 flex items-center justify-center gap-2 font-body"
                >
                  <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Continue Shopping
                </Link>
              </div>
            </div>

            {/* Safe & Secure Footer - only for online payments */}
            {isOnlinePayment && (
              <div className="flex flex-col items-center mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px w-16 bg-gray-200"></div>
                  <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                    <IoShieldCheckmarkOutline className="text-lg text-[#008755]" />
                  </div>
                  <div className="h-px w-16 bg-gray-200"></div>
                </div>
                <p className="text-xs text-black font-body text-center">
                  Safe and secure payments. 100% authentic products.
                </p>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

