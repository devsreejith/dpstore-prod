import { useState } from 'react';
import Scrollbar from '@components/common/scrollbar';
import { useWishlist } from '@utils/use-wishlist';
import { motion } from 'framer-motion';
import { fadeInOut } from '@utils/motion/fade-in-out';
import { useUI } from '@contexts/ui.context';
import { IoClose } from 'react-icons/io5';
import WishlistItem from './wishlist-item';
import Link from '@components/ui/link';
import { ROUTES } from '@utils/routes';

export default function WishlistDrawer() {
  const { closeWishlist, isAuthorized } = useUI();
  const { wishlist } = useWishlist();

  const WISHLIST_LIMIT = 3;
  const [isExpanded, setIsExpanded] = useState(false);

  const showViewMore = wishlist.length > WISHLIST_LIMIT;
  const displayedItems = (!isExpanded && showViewMore)
    ? wishlist.slice(0, WISHLIST_LIMIT)
    : wishlist;

  const isEmpty = wishlist.length === 0;

  return (
    <div className="flex flex-col justify-between w-full h-full">
      <div className="w-full flex justify-between items-center relative ltr:pl-5 ltr:md:pl-7 rtl:pr-5 rtl:md:pr-7 py-0.5 border-b border-gray-100">
        <h2 className="m-0 text-xl font-bold md:text-2xl text-heading">
          Wishlist
        </h2>
        <button
          className="flex items-center justify-center px-4 py-6 text-2xl text-gray-500 transition-opacity md:px-6 lg:py-8 focus:outline-none hover:opacity-60"
          onClick={closeWishlist}
          aria-label="close"
        >
          <IoClose className="text-black mt-1 md:mt-0.5" />
        </button>
      </div>
      {!isEmpty ? (
        <Scrollbar className="flex-grow w-full cart-scrollbar">
          <div className="w-full px-5 md:px-7">
            {displayedItems?.map((item) => (
              <WishlistItem item={item} key={item.id} />
            ))}

            {showViewMore && !isExpanded && (
              <div className="pt-4 pb-2 text-center border-t border-gray-100 mt-2">
                {isAuthorized ? (
                  <Link
                    href={ROUTES.WISHLIST}
                    onClick={() => closeWishlist()}
                    className="inline-block text-xs md:text-sm font-semibold text-[#008755] hover:underline"
                  >
                    View More ({wishlist.length - WISHLIST_LIMIT} remaining)
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="text-xs md:text-sm font-semibold text-[#008755] hover:underline focus:outline-none"
                  >
                    View More ({wishlist.length - WISHLIST_LIMIT} remaining)
                  </button>
                )}
              </div>
            )}
          </div>
        </Scrollbar>
      ) : (
        <motion.div
          layout
          initial="from"
          animate="to"
          exit="from"
          variants={fadeInOut(0.25)}
          className="flex flex-col items-center justify-center px-5 pt-8 pb-5 md:px-7"
        >
          <h3 className="pt-8 text-lg font-bold text-heading">
            Your Wishlist is Empty
          </h3>
        </motion.div>
      )}
    </div>
  );
}



