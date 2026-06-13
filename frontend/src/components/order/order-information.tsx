import OrderDetails from '@components/order/order-details';
import { useOrderQuery } from '@framework/order/get-order';
import { useRouter } from 'next/router';
import usePrice from '@framework/product/use-price';
import { useTranslation } from 'next-i18next';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import http from '@framework/utils/http';

export default function OrderInformation() {
  const {
    query: { id, cart_id },
  } = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationDone, setVerificationDone] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);

  const { t } = useTranslation('common');
  const orderIdentifier = (id || cart_id)?.toString()!;
  const { data, isLoading, refetch } = useOrderQuery(orderIdentifier);
  const { price: total } = usePrice(
    data && {
      amount: Number(data?.total ?? 0) || 0,
      currencyCode: 'AED',
    }
  );

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
  }, [data]);

  const paymentMethodName =
    paymentProvider === 'pp_system_default' || !paymentProvider
      ? 'Cash on Delivery'
      : 'Online Payment Card';

  const paymentStatus = String(data?.payment_status ?? '').toLowerCase();
  const isOnlinePayment = paymentProvider && paymentProvider !== 'pp_system_default';
  
  const capturedAmount =
    Array.isArray(data?.payment_collections) && data.payment_collections.length
      ? Number(data.payment_collections[0]?.captured_amount ?? 0)
      : 0;

  const isPaid = isOnlinePayment
    ? capturedAmount > 0
    : (paymentStatus === 'captured' || paymentStatus === 'paid' || paymentStatus === 'authorized');
  
  const isPaymentFailed = isOnlinePayment && (!isPaid || verificationFailed);

  const isCancelled =
    Boolean(data?.canceled_at) ||
    String(data?.status ?? '').toLowerCase() === 'canceled' ||
    String(data?.status ?? '').toLowerCase() === 'cancelled';

  useEffect(() => {
    if (!data || !paymentCollectionId || !isOnlinePayment || capturedAmount > 0 || verificationDone || verifying) {
      return;
    }

    const verifyPayment = async () => {
      setVerifying(true);
      try {
        await http.post(`/store/payment-collections/${paymentCollectionId}/authorize`);
        setVerificationDone(true);
        refetch();
      } catch (e: any) {
        console.error("Payment verification failed:", e);
        setVerificationFailed(true);
        setVerificationDone(true);
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [data, paymentCollectionId, isOnlinePayment, capturedAmount, verificationDone, verifying, refetch]);

  if (isLoading || verifying) {
    return <div className="py-16 text-center text-sm font-semibold font-body text-heading">Verifying payment status...</div>;
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
    setPayError(null);
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
      ) : (
        /* Outer Card Box */
        <div className="border border-gray-150 rounded-xl bg-white p-8 md:p-10 shadow-sm max-w-2xl mx-auto flex flex-col items-center">
          <div className="relative mb-6">
            {/* Confetti sparkles (4-pointed stars) - only show if payment succeeded or is COD and order is not cancelled */}
            {!isPaymentFailed && !isCancelled && (
              <>
                <span className="absolute -top-2 -left-3 text-sm text-[#1C5E39] font-bold">✦</span>
                <span className="absolute -top-3 -right-3 text-xs text-[#1C5E39] font-bold">✦</span>
                <span className="absolute bottom-1 -left-4 text-xs text-[#1C5E39] font-bold">✦</span>
                <span className="absolute -bottom-1 -right-3 text-sm text-[#1C5E39] font-bold">✦</span>
              </>
            )}

            {/* Check Circle, Warning Exclamation, or Cancelled Cross */}
            {isCancelled ? (
              <div className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center shadow-sm">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            ) : isPaymentFailed ? (
              <div className="w-16 h-16 rounded-full bg-[#D97706]/10 border border-[#D97706]/30 flex items-center justify-center shadow-sm">
                <svg
                  className="w-8 h-8 text-[#D97706]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#1C5E39] flex items-center justify-center shadow-sm">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-heading font-body mb-2">
            {isCancelled ? 'Order Cancelled!' : isPaymentFailed ? 'Payment Awaiting!' : 'Order Received!'}
          </h1>
          <div className="text-xs md:text-sm text-gray-500 font-body mb-8 space-y-1 text-center">
            {isCancelled ? (
              <>
                <p>This order has been cancelled.</p>
              </>
            ) : isPaymentFailed ? (
              <>
                <p>Your order has been registered.</p>
                <p className="text-[#D97706] font-semibold">Payment was unsuccessful or is pending.</p>
              </>
            ) : (
              <>
                <p>Thank you for your purchase.</p>
                <p>Your order has been successfully placed.</p>
              </>
            )}
          </div>

          {/* Metadata Details Horizontal Banner */}
          <div className="w-full border border-gray-150 rounded-xl py-6 px-4 bg-white mb-8 grid grid-cols-3 text-center">
            {/* Column 1: Order Number */}
            <div className="border-r border-dashed border-gray-300 flex flex-col justify-center px-1">
              <span className="text-[10px] md:text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1 font-body">
                Order Number
              </span>
              <span className="text-xs md:text-sm font-bold text-[#1C5E39] block font-body">
                #{formattedOrderNumber}
              </span>
            </div>

            {/* Column 2: Payment Method */}
            <div className="border-r border-dashed border-gray-300 flex flex-col justify-center px-1">
              <span className="text-[10px] md:text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1 font-body">
                Payment Method
              </span>
              <span className="text-xs md:text-sm font-bold text-heading block font-body">
                {paymentMethodName}
              </span>
            </div>

            {/* Column 3: Total */}
            <div className="flex flex-col justify-center px-1">
              <span className="text-[10px] md:text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1 font-body">
                Total
              </span>
              <span className="text-xs md:text-sm font-bold text-[#1C5E39] block font-body">
                {total}
              </span>
            </div>
          </div>

          {payError && (
            <div className="w-full bg-red-50 border border-red-200 text-red-600 rounded-md p-3.5 text-xs font-semibold mb-6 flex items-center gap-2 font-body">
              <span>⚠️</span> {payError}
            </div>
          )}

          {isPaymentFailed ? (
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button
                type="button"
                onClick={continuePayment}
                disabled={paying}
                className="h-10 px-6 bg-[#1C5E39] hover:bg-[#123d25] text-white font-bold text-xs uppercase tracking-wider rounded transition duration-200 flex items-center justify-center gap-1.5"
              >
                <span>{paying ? 'Loading...' : 'Pay Now'}</span>
                <span className="text-sm font-normal">&gt;</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="h-10 px-6 bg-[#1D1D1D] hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded transition duration-200 flex items-center justify-center gap-1.5"
              >
                <span>View Details</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="h-10 px-6 bg-[#1D1D1D] hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded transition duration-200 flex items-center justify-center gap-1.5"
              >
                <span>View Order Details</span>
                <span className="text-sm font-normal">&gt;</span>
              </button>

              <Link
                href="/"
                className="h-10 px-6 border border-[#1C5E39] text-[#1C5E39] hover:bg-[#1C5E39]/5 font-bold text-xs uppercase tracking-wider rounded transition duration-200 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4 text-[#1C5E39]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <span>Back to Home</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
