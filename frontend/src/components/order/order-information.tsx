import OrderDetails from '@components/order/order-details';
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
    let isMounted = true;

    if (isLoading) return;
    if (!data) {
      if (isMounted) {
        setVerificationFailed(true);
        setVerificationDone(true);
      }
      return;
    }

    const isAlreadyPaid = isOnlinePayment
      ? isPaymentSuccessful(paymentCollection)
      : (capturedAmount > 0 || paymentCollectionStatus === 'captured');
    const shouldSkip = isAlreadyPaid;

    if (!paymentCollectionId || !isOnlinePayment) {
      if (isMounted) setVerificationDone(true);
      return;
    }

    if (shouldSkip) {
      if (isMounted) setVerificationDone(true);
      return;
    }

    if (verificationDone || verifying) {
      return;
    }

    const verifyPayment = async () => {
      if (isMounted) setVerifying(true);
      try {
        await http.post(`/store/payment-collections/${paymentCollectionId}/authorize`, {}, { timeout: 8000 });
        await refetch();
        if (isMounted) setVerificationDone(true);
      } catch (e: any) {
        console.error("Payment verification failed:", e);
        // Always refetch order data so isPaid reflects the latest gateway state
        try { await refetch(); } catch (_) {}
        if (isMounted) {
          setVerificationFailed(true);
          setVerificationDone(true);
        }
      } finally {
        if (isMounted) setVerifying(false);
      }
    };

    verifyPayment();

    return () => { isMounted = false; };
  }, [data, paymentCollectionId, isOnlinePayment, capturedAmount, verificationDone, verifying, refetch, isCancelled, paymentCollectionStatus]);

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

  if (isLoading || verifying || (isOnlinePayment && !verificationDone)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] py-16 text-center">
        <div className="relative mb-6 flex items-center justify-center">
          {/* Subtle pulsating outer circle */}
          <div className="absolute w-20 h-20 border border-gray-100 rounded-full animate-ping opacity-70"></div>
          {/* Main spinning ring */}
          <div className="w-12 h-12 border-[3.5px] border-gray-150 border-t-heading rounded-full animate-spin relative z-10"></div>
        </div>
        <h2 className="text-base md:text-lg font-bold text-heading font-body mb-2 animate-pulse">
          Verifying payment status...
        </h2>
        <p className="text-xs md:text-sm text-gray-500 font-body max-w-sm px-4 leading-relaxed">
          Please wait while we confirm your payment transaction. Do not refresh or close this page.
        </p>
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg text-left font-mono text-[11px] text-gray-600 max-w-md mx-auto space-y-1">
          <div className="font-bold border-b border-gray-200 pb-1 mb-2 text-xs text-gray-700">Debug Information:</div>
          <div><strong>Router Query:</strong> {JSON.stringify({ id, cart_id })}</div>
          <div><strong>Order Identifier:</strong> {orderIdentifier || 'undefined'}</div>
          <div><strong>React Query isLoading:</strong> {String(isLoading)}</div>
          <div><strong>Order Data loaded:</strong> {String(!!data)}</div>
          <div><strong>Is Online Payment:</strong> {String(isOnlinePayment)}</div>
          <div><strong>verificationDone:</strong> {String(verificationDone)}</div>
          <div><strong>verifying:</strong> {String(verifying)}</div>
          <div><strong>verificationFailed:</strong> {String(verificationFailed)}</div>
          <div><strong>paymentCollectionId:</strong> {paymentCollectionId || 'none'}</div>
          <div><strong>paymentCollectionStatus:</strong> {paymentCollectionStatus || 'none'}</div>
        </div>
      </div>
    );
  }

  const orderDate = data?.created_at ? new Date(data.created_at) : new Date();
  const yy = String(orderDate.getFullYear()).slice(-2);
  const mm = String(orderDate.getMonth() + 1).padStart(2, '0');
  const dd = String(orderDate.getDate()).padStart(2, '0');
  const displayIdStr = String(data?.display_id ?? '1').padStart(3, '0');
  const formattedOrderNumber = `DP${yy}${mm}${dd}${displayIdStr}`;



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

  useEffect(() => {
    if (verificationDone && typeof window !== 'undefined') {
      const debugInfo = {
        message: "PAYMENT VERIFICATION COMPLETED",
        isPaid,
        isPaymentFailed,
        isCancelled,
        orderId: data?.id,
        orderStatus: data?.status,
        orderCanceledAt: data?.canceled_at,
        paymentStatus: data?.payment_status,
        paymentCollection: paymentCollection ? {
          id: paymentCollection.id,
          status: paymentCollection.status,
          amount: paymentCollection.amount,
          captured_amount: paymentCollection.captured_amount,
          authorized_amount: paymentCollection.authorized_amount,
          payments: paymentCollection.payments?.map((p: any) => ({
            id: p.id,
            provider_id: p.provider_id,
            data: p.data,
          })),
          payment_sessions: paymentCollection.payment_sessions?.map((s: any) => ({
            id: s.id,
            provider_id: s.provider_id,
            status: s.status,
            data: s.data,
          }))
        } : null
      };
      
      window.alert("DEBUG PAYMENT STATUS:\n" + JSON.stringify(debugInfo, null, 2));
    }
  }, [verificationDone, isPaid, isPaymentFailed, isCancelled, data, paymentCollection]);

  if (isLoading || verifying || (isOnlinePayment && !verificationDone)) {
    return (
      <div className="p-10 text-center font-body">
        <h2 className="text-lg font-bold mb-2">Verifying payment status...</h2>
        <p className="text-gray-500 text-sm">Please wait while status is being confirmed.</p>
      </div>
    );
  }

  return (
    <div className="p-10 text-center font-body max-w-lg mx-auto bg-white border rounded-xl shadow-sm my-10">
      <h1 className="text-xl font-bold mb-4">Payment Verification Finished</h1>
      <p className="text-gray-600 mb-6">The payment status details have been displayed in the alert box.</p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-heading text-white font-bold rounded-lg text-sm"
        >
          Re-run Verification
        </button>
        <Link
          href="/my-account/orders"
          className="px-4 py-2 border rounded-lg text-sm text-gray-700 font-semibold"
        >
          Go to Orders
        </Link>
      </div>
    </div>
  );
}
