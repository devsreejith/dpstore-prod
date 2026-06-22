import usePrice from "@framework/product/use-price";
import { useCart } from "@contexts/cart/cart.context";
import { useEffect, useState } from "react";

const CheckoutItemRow = ({ item }: { item: any }) => {
  const { price } = usePrice({
    amount: item.price * (item.quantity ?? 1),
    currencyCode: "AED",
  });
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="w-12 h-12 rounded border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center p-0.5">
        <img
          src={item.image}
          alt={item.name}
          className="object-contain max-h-full max-w-full"
        />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <h3 className="text-xs md:text-sm font-semibold text-black truncate">
          {item.name}
        </h3>
        <p className="text-[11px] md:text-xs text-black mt-0.5 font-normal">
          Qty: {item.quantity ?? 1}
        </p>
      </div>
      <div className="text-xs md:text-sm font-bold text-black flex-shrink-0">
        {price}
      </div>
    </div>
  );
};

interface CheckoutCardProps {
  activeStep: 1 | 2 | 3;
  setActiveStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  selectedAddress: any;
}

const CheckoutCard: React.FC<CheckoutCardProps> = ({
  activeStep,
  setActiveStep,
  selectedAddress,
}) => {
  const [mounted, setMounted] = useState(false);
  const { items, total, isEmpty, cart } = useCart();

  const shippingTotal = typeof cart?.shipping_total === "number" ? cart.shipping_total : 0;
  const hasShipping = shippingTotal > 0;
  const shippingAmount = 25; // 25 AED for all orders
  const itemSubtotal = hasShipping ? total - shippingTotal : total;
  const finalTotal = hasShipping ? total : total + shippingAmount;

  const { price: priceOriginal } = usePrice({
    amount: itemSubtotal,
    currencyCode: "AED",
  });

  const { price: priceTotal } = usePrice({
    amount: finalTotal,
    currencyCode: "AED",
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  if (isEmpty) return null;

  return (
    <div className="pt-0 lg:pt-0">
      {/* DELIVERY ADDRESS summary block (Step 3 only) */}
      {activeStep === 3 && (
        <div className="border border-gray-200 rounded-md bg-white p-5 mb-5 shadow-sm flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <h2 className="text-xs md:text-sm font-bold text-[#008755] uppercase tracking-wider font-body mb-2.5">
              DELIVERY ADDRESS
            </h2>
            {selectedAddress ? (
              <div className="text-xs md:text-sm text-black font-body space-y-1 leading-relaxed">
                <div className="font-bold text-heading text-xs md:text-sm">
                  {selectedAddress.first_name} {selectedAddress.last_name}
                </div>
                <div>
                  {[selectedAddress.address_1, selectedAddress.city, selectedAddress.province, selectedAddress.postal_code]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                {selectedAddress.phone && (
                  <div className="text-black font-normal text-xs">{selectedAddress.phone}</div>
                )}
              </div>
            ) : (
              <span className="text-gray-400 font-normal text-xs">No address selected</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className="text-[10px] md:text-xs font-bold text-[#008755] uppercase hover:underline ml-4 flex-shrink-0"
          >
            Change
          </button>
        </div>
      )}
      {/* Order Summary Block */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm flex flex-col mb-4">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-sm md:text-base font-bold text-[#008755] uppercase tracking-wider font-body">
            Order Summary
          </h2>
          <span className="text-xs text-[#008755] font-semibold bg-[#E8F5E9] px-2.5 py-0.5 rounded-full">
            {items.length} Item{items.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="p-5 pt-2 pb-2 divide-y divide-gray-150 max-h-[260px] overflow-y-auto scrollbar">
          {items.map((item: any) => (
            <CheckoutItemRow item={item} key={item.id} />
          ))}
        </div>
      </div>

      {/* Price Details */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm flex flex-col">
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-sm md:text-base font-bold text-heading uppercase tracking-wider font-body">
            PRICE DETAILS
          </h2>
        </div>

        <div className="p-5 pt-2 space-y-3 text-xs md:text-sm text-heading font-medium font-body">
          <div className="flex justify-between items-center">
            <span className="text-black font-normal">Subtotal ({items.length} item{items.length > 1 ? "s" : ""})</span>
            <span className="text-black font-semibold">{priceOriginal}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-black font-normal">Delivery Charges</span>
            <span className="text-black font-semibold">AED 25.00</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-black font-normal">VAT (5%)</span>
            <span className="text-black font-semibold">AED 0.00</span>
          </div>

          <div className="border-t border-gray-150 pt-3 flex justify-between items-center font-bold text-sm md:text-base text-heading">
            <span>Total Amount</span>
            <span className="text-[#008755]">{priceTotal}</span>
          </div>
        </div>
      </div>

      {/* Estimated Delivery */}
      <div className="border border-gray-150 rounded-xl bg-[#F4F9F6] p-4 flex items-start gap-3 mt-4">
        <div className="w-9 h-9 rounded-lg bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#008755]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-heading">Estimated Delivery</h4>
          <p className="text-[11px] text-black mt-0.5">2 – 3 working days<br/>from the date of shipment</p>
        </div>
      </div>


      {/* Safe & Secure */}
      <div className="border border-gray-150 rounded-xl bg-white p-4 font-body shadow-sm mt-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-[#008755]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-heading">Safe & Secure</h4>
            <p className="text-[11px] text-black mt-0.5">Your payment information is 100% secure and encrypted.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCard;
