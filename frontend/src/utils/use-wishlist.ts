import { useState, useEffect } from 'react';

const WISHLIST_EVENT = 'dtc-wishlist-update';

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dtc-wishlist');
      if (stored) {
        try {
          setWishlist(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      const stored = localStorage.getItem('dtc-wishlist');
      if (stored) {
        try {
          setWishlist(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      } else {
        setWishlist([]);
      }
    };
    window.addEventListener(WISHLIST_EVENT, handleUpdate);
    return () => window.removeEventListener(WISHLIST_EVENT, handleUpdate);
  }, []);

  const saveWishlist = (newWishlist: any[]) => {
    localStorage.setItem('dtc-wishlist', JSON.stringify(newWishlist));
    setWishlist(newWishlist);
    window.dispatchEvent(new Event(WISHLIST_EVENT));
  };

  const isInWishlist = (productId: string | number) => {
    if (!productId) return false;
    return wishlist.some((item) => String(item.id) === String(productId));
  };

  const toggleWishlist = (product: any) => {
    if (!product || !product.id) return;
    if (isInWishlist(product.id)) {
      const updated = wishlist.filter((item) => String(item.id) !== String(product.id));
      saveWishlist(updated);
    } else {
      saveWishlist([...wishlist, product]);
    }
  };

  const clearWishlist = () => {
    saveWishlist([]);
  };

  return {
    wishlist,
    isInWishlist,
    toggleWishlist,
    clearWishlist,
  };
};
