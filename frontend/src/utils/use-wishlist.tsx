import { useState, useEffect, useRef } from 'react';
import { useUI } from '@contexts/ui.context';
import http from '@framework/utils/http';

const WISHLIST_EVENT = 'dtc-wishlist-update';

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState<any[]>([]);
  const { isAuthorized } = useUI();
  const wasAuthorizedRef = useRef(isAuthorized);

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

  const syncWishlistToDb = async (list: any[]) => {
    if (!isAuthorized) return;
    try {
      await http.post('/store/custom/wishlist', { wishlist: list });
    } catch (e) {
      console.error("Failed to sync wishlist to DB:", e);
    }
  };

  const saveWishlist = (newWishlist: any[]) => {
    localStorage.setItem('dtc-wishlist', JSON.stringify(newWishlist));
    setWishlist(newWishlist);
    window.dispatchEvent(new Event(WISHLIST_EVENT));
    syncWishlistToDb(newWishlist);
  };

  useEffect(() => {
    if (isAuthorized) {
      // User logged in: load wishlist from DB and merge with local guest wishlist
      (async () => {
        try {
          const res = await http.get('/store/custom/wishlist');
          const dbWishlist = res.data.wishlist || [];
          
          const stored = localStorage.getItem('dtc-wishlist');
          const localWishlist = stored ? JSON.parse(stored) : [];
          
          const merged = [...localWishlist];
          for (const dbItem of dbWishlist) {
            if (!merged.some(item => String(item.id) === String(dbItem.id))) {
              merged.push(dbItem);
            }
          }
          
          saveWishlist(merged);
        } catch (e) {
          console.error("Failed to load customer wishlist:", e);
        }
      })();
    } else if (wasAuthorizedRef.current) {
      // User logged out: clear wishlist
      saveWishlist([]);
    }
    wasAuthorizedRef.current = isAuthorized;
  }, [isAuthorized]);

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
      saveWishlist([...wishlist, { ...product, quantity: 1 }]);
    }
  };

  const updateWishlistQuantity = (productId: string | number, quantity: number) => {
    if (quantity <= 0) {
      const updated = wishlist.filter((item) => String(item.id) !== String(productId));
      saveWishlist(updated);
    } else {
      const updated = wishlist.map((item) =>
        String(item.id) === String(productId) ? { ...item, quantity } : item
      );
      saveWishlist(updated);
    }
  };

  const clearWishlist = () => {
    saveWishlist([]);
  };

  return {
    wishlist,
    isInWishlist,
    toggleWishlist,
    updateWishlistQuantity,
    clearWishlist,
  };
};


