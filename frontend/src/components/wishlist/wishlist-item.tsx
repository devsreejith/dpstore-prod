import Link from '@components/ui/link';
import { motion } from 'framer-motion';
import { fadeInOut } from '@utils/motion/fade-in-out';
import { IoIosCloseCircle } from 'react-icons/io';
import { useWishlist } from '@utils/use-wishlist';
import usePrice from '@framework/product/use-price';
import { ROUTES } from '@utils/routes';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'next-i18next';

type WishlistItemProps = {
  item: any;
};

const normalizeMediaSrc = (src: any) => {
  const v = String(src ?? "").trim();
  if (!v) return "";

  const backend = String(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000").trim().replace(/\/$/, "");

  if (/^https?:\/\//i.test(v)) {
    return v;
  }

  if (v.startsWith("uploads/") || v.startsWith("/uploads/") || v.startsWith("static/") || v.startsWith("/static/")) {
    const cleanPath = v.startsWith("/") ? v : `/${v}`;
    return `${backend}${cleanPath}`;
  }

  if (v.startsWith("/assets/")) return v;
  if (!v.startsWith("/")) return `/${v}`;
  return v;
};

const WishlistItem: React.FC<WishlistItemProps> = ({ item }) => {
  const { t } = useTranslation('common');
  const { toggleWishlist } = useWishlist();
  const { closeWishlist } = useUI();

  const itemPrice = item.sale_price ? Number(item.sale_price) : Number(item.price ?? 0);

  const { price } = usePrice({
    amount: itemPrice,
    currencyCode: 'AED',
  });

  const imageSrc = (() => {
    const candidates = [
      item?.thumbnail,
      item?.image?.thumbnail,
      item?.image?.original,
      item?.images?.[0]?.url,
      item?.images?.[0]?.src,
    ];
    for (const c of candidates) {
      const n = normalizeMediaSrc(c);
      if (n) return n;
    }
    return "/assets/placeholder/cart-item.svg";
  })();

  return (
    <motion.div
      layout
      initial="from"
      animate="to"
      exit="from"
      variants={fadeInOut(0.25)}
      className={`group w-full h-auto flex justify-start items-center bg-white py-4 md:py-7 border-b border-gray-100 relative last:border-b-0`}
      title={item?.name}
    >
      <div className="relative flex flex-shrink-0 w-24 h-24 overflow-hidden bg-gray-200 rounded-md cursor-pointer md:w-28 md:h-28 ltr:mr-4 rtl:ml-4">
        <img
          src={imageSrc}
          alt={item.name || t('text-product')}
          className="w-full h-full object-cover bg-gray-300"
        />
        <div
          className="absolute top-0 flex flex-col items-center justify-center w-full h-full transition duration-200 ease-in-out bg-black ltr:left-0 rtl:right-0 bg-opacity-30 md:bg-opacity-0 md:group-hover:bg-opacity-30 cursor-pointer"
          onClick={() => toggleWishlist(item)}
          role="button"
          title={t('text-remove') || 'Remove'}
        >
          <IoIosCloseCircle className="relative text-2xl text-white transition duration-300 ease-in-out transform md:scale-0 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100" />
          <span className="text-[10px] text-white font-semibold mt-1 tracking-wide uppercase transition duration-300 ease-in-out transform md:scale-0 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100 font-body">
            {t('text-remove')}
          </span>
        </div>
      </div>

      <div className="flex flex-col w-full overflow-hidden">
        <Link
          href={`${ROUTES.PRODUCT}/${item?.slug}?from=wishlist`}
          onClick={closeWishlist}
          className="truncate text-sm text-heading mb-1.5 -mt-1 font-semibold"
        >
          {item.name}
        </Link>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm font-semibold text-heading">
            {price}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default WishlistItem;

