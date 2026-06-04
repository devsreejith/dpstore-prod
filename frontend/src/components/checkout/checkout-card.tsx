import usePrice from "@framework/product/use-price";
import { useCart } from "@contexts/cart/cart.context";
import { useEffect, useState } from "react";

const CheckoutCard: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { items, total, isEmpty } = useCart();

  // Dynamic original price simulation to display realistic savings
  const originalAmount = Math.round(total * 1.25);
  const discountAmount = originalAmount - total;

  const { price: priceOriginal } = usePrice({
    amount: originalAmount,
    currencyCode: "AED",
  });

  const { price: priceDiscount } = usePrice({
    amount: discountAmount,
    currencyCode: "AED",
  });

  const { price: priceTotal } = usePrice({
    amount: total,
    currencyCode: "AED",
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  if (isEmpty) return null;

  return (
    <div className="pt-0 lg:pt-0 ltr:2xl:pl-4 rtl:2xl:pr-4">
      <div className="border border-gray-200 rounded-md bg-white overflow-hidden shadow-sm flex flex-col">
        {/* Price details header */}
        <div className="border-b border-gray-150 px-5 py-4 bg-gray-50/50">
          <h2 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider font-body">
            PRICE DETAILS
          </h2>
        </div>

        {/* Details list */}
        <div className="p-5 space-y-4 text-xs md:text-sm text-heading font-medium font-body">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Price ({items.length} item{items.length > 1 ? "s" : ""})</span>
            <span>{priceOriginal}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500">Discount</span>
            <span className="text-emerald-600">-{priceDiscount}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500">Delivery Charges</span>
            <span className="text-emerald-600 uppercase font-bold text-10px">Free</span>
          </div>

          <div className="border-t border-gray-150 pt-4 flex justify-between items-center font-bold text-base">
            <span>Total Amount</span>
            <span>{priceTotal}</span>
          </div>
        </div>

        {/* Savings banner */}
        {discountAmount > 0 && (
          <div className="bg-emerald-50 border-t border-emerald-100 px-5 py-3 text-xs md:text-sm text-emerald-700 font-bold font-body text-center">
            You will save {priceDiscount} on this order
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider text-center">
        🔒 Safe and Secure Payments. 100% Authentic products.
      </div>
    </div>
  );
};

export default CheckoutCard;
