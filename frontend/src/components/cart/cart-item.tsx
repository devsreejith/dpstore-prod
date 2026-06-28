import Link from '@components/ui/link';
import { motion } from 'framer-motion';
import { fadeInOut } from '@utils/motion/fade-in-out';
import { IoIosCloseCircle } from 'react-icons/io';
import Counter from '@components/common/counter';
import { useCart } from '@contexts/cart/cart.context';
import usePrice from '@framework/product/use-price';
import { ROUTES } from '@utils/routes';
import { generateCartItemName } from '@utils/generate-cart-item-name';
import { useTranslation } from 'next-i18next';
import { useUI } from '@contexts/ui.context';
import { useRouter } from 'next/router';
import { getLocalizedName } from '@utils/get-localized-name';

type CartItemProps = {
  item: any;
};

const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { t } = useTranslation('common');
  const { locale } = useRouter();
  const itemName = getLocalizedName(item, locale);
  const { closeCart } = useUI();
  const { addItemToCart, removeItemFromCart, clearItemFromCart, inventoryMap } = useCart();
  const stock = inventoryMap[item.variant_id];
  const isOutOfStock = stock !== undefined && stock <= 0;
  const isInsufficientStock = stock !== undefined && stock > 0 && stock < item.quantity;
  const { price } = usePrice({
    amount: item.price,
    currencyCode: 'AED',
  });
  const { price: totalPrice } = usePrice({
    amount: item.itemTotal,
    currencyCode: 'AED',
  });
  const imageSrc = (() => {
    const v = String(item?.image ?? '').trim();
    if (!v) return '/assets/placeholder/cart-item.svg';
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith('/')) return v;
    return `/${v}`;
  })();

  return (
    <motion.div
      layout
      initial="from"
      animate="to"
      exit="from"
      variants={fadeInOut(0.25)}
      className={`group w-full h-auto flex justify-start items-center bg-white py-4 md:py-7 border-b border-gray-100 relative last:border-b-0`}
      title={itemName}
    >
      <div className="relative flex flex-shrink-0 w-24 h-24 overflow-hidden bg-gray-200 rounded-md cursor-pointer md:w-28 md:h-28 ltr:mr-4 rtl:ml-4">
        <img
          src={imageSrc}
          alt={itemName || 'Product Image'}
          className="w-full h-full object-cover bg-gray-300"
        />
        <div
          className="absolute top-0 flex flex-col items-center justify-center w-full h-full transition duration-200 ease-in-out bg-black ltr:left-0 rtl:right-0 bg-opacity-30 md:bg-opacity-0 md:group-hover:bg-opacity-30 cursor-pointer"
          onClick={() => clearItemFromCart(item.id)}
          role="button"
          title="Remove Product"
        >
          <IoIosCloseCircle className="relative text-2xl text-white transition duration-300 ease-in-out transform md:scale-0 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100" />
          <span className="text-[10px] text-white font-semibold mt-1 tracking-wide uppercase transition duration-300 ease-in-out transform md:scale-0 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100 font-body">
            Remove
          </span>
        </div>
      </div>

      <div className="flex flex-col w-full overflow-hidden">
        <Link
          href={`${ROUTES.PRODUCT}/${item?.slug}?from=cart`}
          onClick={closeCart}
          className="truncate text-sm text-heading mb-1.5 -mt-1"
        >
          {generateCartItemName(itemName, item.attributes)}
        </Link>
        {/* @ts-ignore */}
        <span className="text-sm text-gray-400 mb-2.5">
          {t('text-unit-price')} : &nbsp; {price}
        </span>
        {isOutOfStock && (
          <span className="text-xs text-red-500 font-semibold mb-2 block -mt-1.5">
            Out of stock
          </span>
        )}
        {isInsufficientStock && (
          <span className="text-xs text-red-500 font-semibold mb-2 block -mt-1.5">
            Only {stock} left in stock
          </span>
        )}

        <div className="flex items-end justify-between">
          <Counter
            quantity={item.quantity}
            onIncrement={() => addItemToCart(item, 1)}
            onDecrement={() => removeItemFromCart(item.id)}
            disableIncrement={stock !== undefined && item.quantity >= stock}
            variant="dark"
          />
          <span className="text-sm font-semibold leading-5 md:text-base text-heading">
            {totalPrice}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default CartItem;
