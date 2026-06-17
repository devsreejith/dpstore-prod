import usePrice from "@framework/product/use-price";
import { useCart } from "@contexts/cart/cart.context";
import { useEffect, useState } from "react";

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
  const { items, total, isEmpty } = useCart();

  // Keep the real price and display discount as AED 00.00 for now
  const originalAmount = total;
  const discountAmount = 0;

  const { price: priceOriginal } = usePrice({
    amount: originalAmount,
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
      {/* DELIVERY ADDRESS summary block (Step 3 only) */}
      {activeStep === 3 && (
        <div className="border border-gray-200 rounded-md bg-white p-5 mb-5 shadow-sm flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <h2 className="text-xs md:text-sm font-bold text-[#008755] uppercase tracking-wider font-body mb-2.5">
              DELIVERY ADDRESS
            </h2>
            {selectedAddress ? (
              <div className="text-xs md:text-sm text-gray-600 font-body space-y-1 leading-relaxed">
                <div className="font-bold text-heading text-xs md:text-sm">
                  {selectedAddress.first_name} {selectedAddress.last_name}
                </div>
                <div>
                  {[selectedAddress.address_1, selectedAddress.city, selectedAddress.province, selectedAddress.postal_code]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                {selectedAddress.phone && (
                  <div className="text-gray-500 font-normal text-xs">{selectedAddress.phone}</div>
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
      <div className="border border-gray-200 rounded-md bg-white overflow-hidden shadow-sm flex flex-col">
        {/* Price details header */}
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-sm md:text-base font-bold text-heading uppercase tracking-wider font-body">
            PRICE DETAILS
          </h2>
        </div>

        {/* Details list */}
        <div className="p-5 pt-2 space-y-4 text-xs md:text-sm text-heading font-medium font-body">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-normal">Price ({items.length} item{items.length > 1 ? "s" : ""})</span>
            <span className="font-mono text-heading font-semibold">{priceOriginal}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-normal">Discount</span>
            <span className="text-[#008755] font-mono font-semibold">AED 00.00</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-normal">Delivery Charges</span>
            <span className="text-[#008755] uppercase font-bold text-10px">Free</span>
          </div>

          <div className="border-t border-gray-150 pt-4 flex justify-between items-center font-bold text-sm md:text-base text-heading">
            <span>Total Amount</span>
            <span className="font-mono">{priceTotal}</span>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="mt-5 px-1 flex items-start gap-2.5 text-[10px] md:text-xs text-gray-500 font-normal uppercase tracking-wider">
        <span className="text-xl text-gray-400 mt-0.5">🛡️</span>
        <div className="flex flex-col text-left leading-normal font-body">
          <span>Safe and Secure Payments.</span>
          <span>100% Authentic products.</span>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCard;
