import { motion } from 'framer-motion';
import Loader from '@components/ui/loader';
import { fadeInTop } from '@utils/motion/fade-in-top';
import Link from '@components/ui/link';
import { useTranslation } from 'next-i18next';
import { useOrdersQuery } from '@framework/order/get-all-orders';
import { formatPrice } from '@framework/product/use-price';
import { useState } from 'react';

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

  return v;
};

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

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let bgClass = '';
  let textClass = '';
  let borderClass = '';
  let icon = null;

  switch (status) {
    case 'Payment Failed':
      bgClass = 'bg-[#FFF5F5]';
      textClass = 'text-[#E4002B]';
      borderClass = 'border-[#FDE8E8]';
      icon = (
        <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-[#E4002B]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      break;
    case 'Cancelled':
    case 'Canceled':
      bgClass = 'bg-[#FFF5F5]';
      textClass = 'text-[#E4002B]';
      borderClass = 'border-[#FDE8E8]';
      icon = (
        <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-[#E4002B]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      break;
    case 'Delivered':
      bgClass = 'bg-[#E8F5E9]';
      textClass = 'text-[#26D07C]';
      borderClass = 'border-[#D1FAE5]';
      icon = (
        <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-[#26D07C]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
      break;
    case 'Shipped':
    case 'Out for Delivery':
    case 'Out For Delivery':
      bgClass = 'bg-[#EEF2FF]';
      textClass = 'text-[#4F46E5]';
      borderClass = 'border-[#E0E7FF]';
      icon = (
        <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-[#4F46E5]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125a1.125 1.125 0 001.125-1.125V9.75M8.25 13.875h7.5M8.25 9.75h7.5" />
        </svg>
      );
      break;
    case 'Processing':
    default:
      bgClass = 'bg-[#EFF6FF]';
      textClass = 'text-[#2563EB]';
      borderClass = 'border-[#DBEAFE]';
      icon = (
        <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0h1.5m-1.5 0a7.5 7.5 0 100-15M12 4.5V3m0 16.5V21" />
        </svg>
      );
      break;
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${bgClass} ${textClass} ${borderClass}`}>
      {icon}
      {status}
    </span>
  );
};

const OrdersTable: React.FC = () => {
  const { t } = useTranslation('common');
  const { data, isLoading, error } = useOrdersQuery({});
  const [activeTab, setActiveTab] = useState('All Orders');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const orders = Array.isArray(data?.orders)
    ? [...data.orders].sort((a, b) => {
        const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
    : [];

  const errorText = (() => {
    if (!error) return '';
    const status = (error as any)?.response?.status;
    const msg = String((error as any)?.response?.data?.message ?? (error as any)?.message ?? '');
    if (status === 400 && msg.toLowerCase().includes('unrecognized fields')) {
      return 'Unable to load orders right now. Please refresh the page.';
    }
    return msg || 'Unable to load orders. Please try again later.';
  })();

  const fmt = (amount: any, currencyCode: any) => {
    const n = typeof amount === 'number' ? amount : Number(amount);
    const code = String(currencyCode || 'AED').toUpperCase();
    if (!Number.isFinite(n)) return '';
    return formatPrice({ amount: n, currencyCode: code, locale: 'en' });
  };

  const getPaymentProvider = (o: any): string => {
    if (Array.isArray(o?.payment_collections) && o.payment_collections.length) {
      const col = o.payment_collections[0];
      if (Array.isArray(col.payments) && col.payments.length) {
        const p = col.payments.find((py: any) => py.provider_id && py.provider_id !== 'pp_system_default');
        return p ? String(p.provider_id) : String(col.payments[0].provider_id ?? '');
      } else if (Array.isArray(col.payment_sessions) && col.payment_sessions.length) {
        const s = col.payment_sessions.find((sn: any) => sn.provider_id && sn.provider_id !== 'pp_system_default');
        return s ? String(s.provider_id) : String(col.payment_sessions[0].provider_id ?? '');
      }
    }
    return '';
  };

  const isOrderPaid = (o: any) => {
    const paymentStatus = String(o?.payment_status ?? '').toLowerCase();
    const paymentProvider = getPaymentProvider(o);
    const isOnlinePayment = paymentProvider && paymentProvider !== 'pp_system_default';
    const paymentCollection = Array.isArray(o?.payment_collections) && o.payment_collections.length
      ? o.payment_collections[0]
      : null;

    if (isOnlinePayment) {
      return isPaymentSuccessful(paymentCollection);
    }
    return paymentStatus === 'captured' || paymentStatus === 'paid' || paymentStatus === 'authorized';
  };

  const getDisplayStatus = (o: any): string => {
    const isCancelled = Boolean(o?.canceled_at) || String(o?.status ?? '').toLowerCase() === 'cancelled' || String(o?.status ?? '').toLowerCase() === 'canceled';
    
    const paymentProvider = getPaymentProvider(o);
    const isOnlinePayment = paymentProvider && paymentProvider !== 'pp_system_default';
    const isPaymentPaid = isOrderPaid(o);
    const isCustomerCancelled = o?.metadata?.customer_cancelled === 'true' || o?.metadata?.customer_cancelled === true;
    
    const isGenuinelyCancelled = isCancelled && (!isOnlinePayment || isPaymentPaid || isCustomerCancelled);

    if (isGenuinelyCancelled) return 'Cancelled';

    const fulfillment = String(o?.fulfillment_status ?? '').toLowerCase();
    if (fulfillment === 'delivered') return 'Delivered';
    if (fulfillment === 'out_for_delivery') return 'Out for Delivery';
    if (fulfillment === 'shipped') return 'Shipped';
    if (fulfillment === 'partial_shipped' || fulfillment === 'fulfilled') {
      return 'Processing';
    }

    if (!isPaymentPaid) {
      return 'Payment Failed';
    }
    return 'Processing';
  };

  const getFormattedOrderId = (o: any) => {
    if (o?.metadata?.order_number) {
      return String(o.metadata.order_number);
    }
    const orderDate = o?.created_at ? new Date(o.created_at) : new Date();
    const yy = String(orderDate.getFullYear()).slice(-2);
    const displayIdStr = String(o?.display_id ?? '1').padStart(4, '0');
    return `ORD-OL${yy}-${displayIdStr}`;
  };

  const fmtDateOnly = (v: any) => {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  };

  const fmtTimeOnly = (v: any) => {
    const d = new Date(v);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Filter orders by active tab
  const filteredOrders = orders.filter((order) => {
    const status = getDisplayStatus(order);
    if (activeTab === 'All Orders') return true;
    if (activeTab === 'Shipped') return status === 'Shipped' || status === 'Out for Delivery';
    if (activeTab === 'Delivered') return status === 'Delivered';
    if (activeTab === 'Cancelled') return status === 'Cancelled';
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredOrders.length);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const showingText = filteredOrders.length > 0
    ? `Showing ${startIndex + 1} to ${endIndex} of ${filteredOrders.length} orders`
    : `Showing 0 to 0 of 0 orders`;

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const tabs = ['All Orders', 'Shipped', 'Delivered', 'Cancelled'];

  return (
    <div className="w-full">
      <div className="mb-6 font-body">
        <h2 className="text-xl md:text-2xl font-bold text-[#005844] mb-1 font-body">My Orders</h2>
        <p className="text-sm text-gray-700">Track, view and manage your orders</p>
      </div>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar scroll-smooth font-body">
        <div className="flex gap-6 md:gap-8 min-w-max pb-0.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                className={`text-xs md:text-sm font-semibold whitespace-nowrap pb-3 border-b-2 transition duration-200 ${
                  isActive
                    ? 'border-[#008755] text-[#008755]'
                    : 'border-transparent text-gray-700 hover:text-black'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        layout
        initial="from"
        animate="to"
        exit="from"
        //@ts-ignore
        variants={fadeInTop(0.35)}
        className="w-full"
      >
        {isLoading ? (
          <Loader size="medium" text={t('text-loading')} />
        ) : error ? (
          <div className="text-sm text-red-600 py-10 text-center font-body">{errorText}</div>
        ) : filteredOrders.length ? (
          <div className="w-full flex flex-col">
            {/* Order items list */}
            <div className="divide-y divide-gray-200">
              {paginatedOrders.map((order: any) => {
                const orderStatus = getDisplayStatus(order);
                const orderTotal = fmt(order.total, order.currency_code);

                const firstItem = Array.isArray(order?.items) && order.items.length > 0 ? order.items[0] : null;
                const itemThumb = firstItem ? pickOrderItemThumb(firstItem) : '';
                const itemTitle = firstItem ? (firstItem.title || firstItem.product_title) : 'Product';

                // Status dot color
                let dotColor = 'bg-blue-500'; // Processing
                if (orderStatus === 'Delivered') dotColor = 'bg-green-500';
                else if (orderStatus === 'Cancelled' || orderStatus === 'Canceled') dotColor = 'bg-red-500';
                else if (orderStatus === 'Returned') dotColor = 'bg-orange-500';
                else if (orderStatus === 'Shipped' || orderStatus === 'Out for Delivery') dotColor = 'bg-indigo-500';
                else if (orderStatus === 'Payment Failed') dotColor = 'bg-red-500';

                // Status text color
                let statusTextColor = 'text-blue-600'; // Processing
                if (orderStatus === 'Delivered') statusTextColor = 'text-green-600';
                else if (orderStatus === 'Cancelled' || orderStatus === 'Canceled') statusTextColor = 'text-red-600';
                else if (orderStatus === 'Returned') statusTextColor = 'text-orange-600';
                else if (orderStatus === 'Shipped' || orderStatus === 'Out for Delivery') statusTextColor = 'text-indigo-600';
                else if (orderStatus === 'Payment Failed') statusTextColor = 'text-red-600';

                return (
                  <Link
                    key={order.id}
                    href={`/my-account/orders/${getFormattedOrderId(order)}`}
                    className="flex items-center gap-4 md:gap-6 py-4 px-1 hover:bg-gray-50/50 transition duration-150 group cursor-pointer"
                  >
                    {/* Product Image */}
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded border border-gray-200 overflow-hidden bg-white p-1.5 flex items-center justify-center flex-shrink-0 group-hover:border-gray-300 transition">
                      {itemThumb ? (
                        <img src={itemThumb} alt="" className="object-contain max-h-full max-w-full" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[9px] text-gray-400 font-body">No Image</div>
                      )}
                    </div>

                    {/* Product Name */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm md:text-base font-medium text-heading truncate max-w-[200px] md:max-w-[350px] group-hover:text-[#008755] transition font-body">
                        {itemTitle}
                      </h4>
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 text-sm md:text-base font-medium text-heading font-body hidden sm:block">
                      {orderTotal}
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0 flex items-center gap-1.5 min-w-[100px] md:min-w-[130px] justify-end">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}></span>
                      <span className={`text-xs md:text-sm font-semibold ${statusTextColor} font-body whitespace-nowrap`}>
                        {orderStatus}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1 py-4 border-t border-gray-200 bg-white font-body mt-2">
              <div className="text-xs md:text-sm text-gray-700 font-semibold">
                {showingText}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`w-8 h-8 rounded border flex items-center justify-center text-xs font-semibold transition ${
                    currentPage === 1
                      ? 'border-gray-150 text-gray-300 cursor-not-allowed bg-gray-50/50'
                      : 'border-gray-200 text-heading hover:bg-gray-50'
                  }`}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isPageActive = currentPage === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded flex items-center justify-center text-xs font-semibold transition ${
                        isPageActive
                          ? 'bg-[#008755] text-white border border-[#008755]'
                          : 'border border-gray-200 text-heading hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`w-8 h-8 rounded border flex items-center justify-center text-xs font-semibold transition ${
                    currentPage === totalPages
                      ? 'border-gray-150 text-gray-300 cursor-not-allowed bg-gray-50/50'
                      : 'border-gray-200 text-heading hover:bg-gray-50'
                  }`}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-md p-8 bg-gray-50/50 text-center py-12 font-body">
            <div className="text-base text-heading font-semibold">No orders found</div>
            <p className="mt-1 text-sm text-gray-400 max-w-sm mx-auto">
              No orders found in the &quot;{activeTab}&quot; category.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OrdersTable;
