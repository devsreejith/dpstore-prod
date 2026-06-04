import { motion } from 'framer-motion';
import { fadeInTop } from '@utils/motion/fade-in-top';
import Link from '@components/ui/link';
import { useTranslation } from 'next-i18next';
import { useOrdersQuery } from '@framework/order/get-all-orders';
import { formatPrice } from '@framework/product/use-price';
import Button from '@components/ui/button';

const OrdersTable: React.FC = () => {
  const { t } = useTranslation('common');
  const { data, isLoading, error } = useOrdersQuery({});
  
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

  const getDisplayStatus = (o: any) => {
    const canceled = Boolean(o?.canceled_at) || String(o?.status ?? '').toLowerCase() === 'cancelled' || String(o?.status ?? '').toLowerCase() === 'canceled';
    if (canceled) return 'Cancelled';
    const fulfillment = String(o?.fulfillment_status ?? '').toLowerCase();
    if (fulfillment === 'delivered') return 'Delivered';
    if (fulfillment === 'out_for_delivery') return 'Out for Delivery';
    if (fulfillment === 'shipped') return 'Shipped';
    if (fulfillment === 'partial_shipped' || fulfillment === 'fulfilled') {
      return 'Processing';
    }
    const payment = String(o?.payment_status ?? '').toLowerCase();
    if (
      String(o?.status ?? '').toLowerCase() === 'pending' ||
      (payment && payment !== 'captured' && payment !== 'paid')
    ) {
      return 'Payment Pending';
    }
    return 'Processing';
  };

  const fmtDate = (v: any) => {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  };

  return (
    <div className="w-full">
      <h2 className="text-xl md:text-2xl font-bold text-heading mb-6 font-body">Orders</h2>

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
          <div className="text-sm text-body py-10 text-center font-body">{t('text-loading')}</div>
        ) : error ? (
          <div className="text-sm text-red-600 py-10 text-center font-body">{errorText}</div>
        ) : orders.length ? (
          <div className="w-full overflow-x-auto border border-gray-200 rounded-md">
            <table className="w-full text-left border-collapse font-body">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs md:text-sm text-heading font-bold">
                  <th className="py-4 px-5 font-bold">Order</th>
                  <th className="py-4 px-5 font-bold">Date</th>
                  <th className="py-4 px-5 font-bold">Status</th>
                  <th className="py-4 px-5 font-bold">Total</th>
                  <th className="py-4 px-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-xs md:text-sm text-body">
                {orders.map((order: any) => {
                  const displayId = order?.display_id ?? order?.custom_display_id ?? order?.id;
                  const orderDate = fmtDate(order.created_at);
                  const orderStatus = getDisplayStatus(order);
                  const totalItems = Array.isArray(order?.items)
                    ? order.items.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0)
                    : 0;
                  const orderTotal = fmt(order.total, order.currency_code);
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-4 px-5 font-semibold text-heading">
                        <Link href={`/my-account/orders/${order.id}`} className="underline hover:text-black">
                          #{displayId}
                        </Link>
                      </td>
                      <td className="py-4 px-5">{orderDate}</td>
                      <td className="py-4 px-5 font-medium">{orderStatus}</td>
                      <td className="py-4 px-5">
                        {orderTotal} for {totalItems} item{totalItems !== 1 ? 's' : ''}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/my-account/orders/${order.id}`}
                          className="inline-flex items-center justify-center bg-heading text-white hover:bg-gray-600 rounded px-4 py-1.5 text-xs font-semibold font-body transition duration-150"
                        >
                          view
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-md p-8 bg-gray-50/50 text-center py-12 font-body">
            <div className="text-base text-heading font-semibold">No orders found</div>
            <p className="mt-1 text-sm text-gray-400 max-w-sm mx-auto">
              You haven't placed any orders yet.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OrdersTable;
