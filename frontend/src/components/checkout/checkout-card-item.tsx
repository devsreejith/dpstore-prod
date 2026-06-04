import { Item } from "@contexts/cart/cart.utils";
import { generateCartItemName } from "@utils/generate-cart-item-name";
import usePrice from "@framework/product/use-price";

export const CheckoutItem: React.FC<{ item: Item }> = ({ item }) => {
  const { price } = usePrice({
    amount: item.itemTotal,
    currencyCode: "AED",
  });
  const imageSrc = (() => {
    const v = String((item as any)?.image ?? "").trim();
    if (!v) return "/assets/placeholder/order-product.svg";
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith("/")) return v;
    return `/${v}`;
  })();
  return (
    <div className="flex py-4 items-center lg:px-3 border-b border-gray-300">
      <div className="relative flex shrink-0 border rounded-md border-gray-300 w-16 h-16 overflow-hidden">
        <img
          src={imageSrc}
          alt="product"
          className="w-full h-full object-cover"
        />
      </div>
      <h6 className="text-sm ltr:pl-3 rtl:pr-3 font-regular text-heading">
        {generateCartItemName(item.name, item.attributes)}
      </h6>
      <div className="flex ltr:ml-auto rtl:mr-auto text-heading text-sm ltr:pl-2 rtl:pr-2 flex-shrink-0">
        {price}
      </div>
    </div>
  );
};
