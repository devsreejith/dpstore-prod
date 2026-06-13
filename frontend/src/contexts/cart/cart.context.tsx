import React from "react";
import http from "@framework/utils/http";
import { Item, getItem } from "./cart.utils";
import { useUI } from "@contexts/ui.context";
type State = {
  items: Item[];
  isEmpty: boolean;
  totalItems: number;
  totalUniqueItems: number;
  total: number;
  meta?: any | null;
  isLoading?: boolean;
};
interface CartProviderState extends State {
  addItemToCart: (item: Item, quantity: number) => void;
  removeItemFromCart: (id: Item["id"]) => void;
  // updateItem: (id: Item["id"], payload: object) => void;
  // updateItemQuantity: (id: Item["id"], quantity: number) => void;
  clearItemFromCart: (id: Item["id"]) => void;
  getItemFromCart: (id: Item["id"]) => any | undefined;
  isInCart: (id: Item["id"]) => boolean;
  // updateCartMetadata: (metadata: Metadata) => void;
  refreshCart: () => Promise<void>;
  cartId?: string | null;
  cart?: any;
  placeOrder: (input: {
    email: string;
    shipping_address: any;
    billing_address?: any;
    shipping_option_id?: string;
    payment_provider_id?: string;
  }) => Promise<{ type: "order" | "cart"; order?: any; cart?: any; error?: any; payment_url?: string }>;
}
export const cartContext = React.createContext<CartProviderState | undefined>(
  undefined
);

cartContext.displayName = "CartContext";

export const useCart = () => {
  const context = React.useContext(cartContext);
  if (context === undefined) {
    throw new Error(`useCart must be used within a CartProvider`);
  }
  return context;
};

export const CartProvider: React.FC = (props) => {
  const { isAuthorized } = useUI();
  const CART_ID_KEY = "medusa_cart_id";
  const regionIdRef = React.useRef<string | null>(null);
  const salesChannelIdRef = React.useRef<string | null>(null);
  const ignoreConfiguredRegionRef = React.useRef(false);
  const ignoreConfiguredSalesChannelRef = React.useRef(false);

  const [cart, setCart] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const setCartId = (id: string | null) => {
    try {
      if (!id) localStorage.removeItem(CART_ID_KEY);
      else localStorage.setItem(CART_ID_KEY, id);
    } catch {}
  };

  const getCartId = () => {
    try {
      return localStorage.getItem(CART_ID_KEY);
    } catch {
      return null;
    }
  };

  const normalizeMediaSrc = React.useCallback((src: any) => {
    const v = String(src ?? "").trim();
    if (!v) return "";

    const backend = String(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000").trim().replace(/\/$/, "");

    if (/^https?:\/\//i.test(v)) {
      // If it is already an absolute URL pointing to backend, keep it absolute!
      if (backend && v.startsWith(backend)) {
        return v;
      }
      // If it points to absolute backend in other formats, or external paths, keep as is
      return v;
    }

    if (v.startsWith("uploads/") || v.startsWith("/uploads/") || v.startsWith("static/") || v.startsWith("/static/")) {
      const cleanPath = v.startsWith("/") ? v : `/${v}`;
      return `${backend}${cleanPath}`;
    }

    if (v.startsWith("/assets/")) return v;
    if (!v.startsWith("/")) return `/${v}`;
    return v;
  }, []);

  const pickLineItemImage = React.useCallback(
    (li: any) => {
      const candidates = [
        li?.thumbnail,
        li?.variant?.product?.thumbnail,
        li?.variant?.product?.images?.[0]?.url,
        li?.variant?.product?.images?.[0]?.src,
        li?.product?.thumbnail,
        li?.product?.images?.[0]?.url,
        li?.product?.images?.[0]?.src,
      ];
      for (const c of candidates) {
        const n = normalizeMediaSrc(c);
        if (n) return n;
      }
      return "";
    },
    [normalizeMediaSrc]
  );

  const retrieveCart = React.useCallback(async (id: string) => {
    try {
      const res = await http.get(`/store/carts/${id}`);
      return res?.data?.cart;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 400) {
        const res = await http.get(`/store/carts/${id}`);
        return res?.data?.cart;
      }
      throw e;
    }
  }, []);

  const resolveRegionId = React.useCallback(async () => {
    if (regionIdRef.current) return regionIdRef.current;
    if (!ignoreConfiguredRegionRef.current) {
      const configured = String((process.env.NEXT_PUBLIC_MEDUSA_REGION_ID as any) ?? "").trim();
      if (configured) {
        regionIdRef.current = configured;
        return configured;
      }
    }
    try {
      const res = await http.get(`/store/regions`);
      const regions = Array.isArray(res?.data?.regions) ? res.data.regions : [];
      const id = String(regions?.[0]?.id ?? "").trim();
      if (id) regionIdRef.current = id;
      return id || null;
    } catch {
      return null;
    }
  }, []);

  const resolveSalesChannelId = React.useCallback(async () => {
    if (salesChannelIdRef.current) return salesChannelIdRef.current;
    if (!ignoreConfiguredSalesChannelRef.current) {
      const configured = String((process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID as any) ?? "").trim();
      if (configured) {
        salesChannelIdRef.current = configured;
        return configured;
      }
    }
    return null;
  }, []);

  const createCart = React.useCallback(async () => {
    const key = String(
      (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as any) ??
        (process.env.NEXT_PUBLIC_MEDUSA_API_KEY as any) ??
        ""
    ).trim();
    if (!key) {
      throw new Error(
        "Missing Medusa publishable key (set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY or NEXT_PUBLIC_MEDUSA_API_KEY)"
      );
    }
    const regionId = await resolveRegionId();
    const salesChannelId = await resolveSalesChannelId();
    const payload: any = {};
    if (regionId) payload.region_id = regionId;
    if (salesChannelId) payload.sales_channel_id = salesChannelId;
    const res = await http.post(`/store/carts`, payload);
    return res?.data?.cart;
  }, [resolveRegionId, resolveSalesChannelId]);

  const ensureCart = React.useCallback(async () => {
    if (cart?.id) return cart;
    const existingId = getCartId();
    if (existingId) {
      try {
        const c = await retrieveCart(existingId);
        if (c?.id) {
          if (!c?.region_id || c?.completed_at) {
            setCartId(null);
          } else {
            setCart(c);
            return c;
          }
        }
      } catch {
        setCartId(null);
      }
    }
    let created: any;
    try {
      created = await createCart();
    } catch (e: any) {
      const hasConfigured = !!String(process.env.NEXT_PUBLIC_MEDUSA_REGION_ID ?? "").trim() ||
                            !!String(process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID ?? "").trim();
      if (hasConfigured && !ignoreConfiguredRegionRef.current && !ignoreConfiguredSalesChannelRef.current) {
        ignoreConfiguredRegionRef.current = true;
        ignoreConfiguredSalesChannelRef.current = true;
        regionIdRef.current = null;
        salesChannelIdRef.current = null;
        try {
          created = await createCart();
        } catch (retryErr) {
          throw retryErr;
        }
      } else {
        throw e;
      }
    }
    if (created?.id) setCartId(created.id);
    setCart(created);
    return created;
  }, [cart, createCart, retrieveCart]);

  const refreshCart = React.useCallback(async () => {
    const id = cart?.id || getCartId();
    if (!id) return;
    try {
      const c = await retrieveCart(id);
      if (c?.id) setCart(c);
    } catch {}
  }, [cart?.id, retrieveCart]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await ensureCart();
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [ensureCart]);

  React.useEffect(() => {
    if (!isAuthorized) return;
    if (!cart?.id) return;
    if (cart?.customer?.id) return;
    (async () => {
      try {
        const res = await http.post(`/store/carts/${cart.id}/customer`, {});
        const next = res?.data?.cart;
        if (next?.id) setCart(next);
      } catch {}
    })();
  }, [isAuthorized, cart?.customer?.id, cart?.id]);

  const items = React.useMemo(() => {
    const src = Array.isArray(cart?.items) ? cart.items : [];
    return src.map((li: any) => {
      const unitPrice = typeof li?.unit_price === "number" ? li.unit_price : Number(li?.unit_price ?? 0) || 0;
      const qty = typeof li?.quantity === "number" ? li.quantity : Number(li?.quantity ?? 0) || 0;
      const image = pickLineItemImage(li) || "/assets/placeholder/cart-item.svg";
      return {
        id: li?.id,
        name: li?.title ?? li?.product_title ?? "",
        slug: li?.product_handle ?? "",
        image,
        price: unitPrice,
        quantity: qty,
        attributes: {},
        itemTotal: unitPrice * qty,
        variant_id: li?.variant_id,
      } as any;
    });
  }, [cart?.items, pickLineItemImage]);

  const totalItems = React.useMemo(() => {
    return items.reduce((sum: number, it: any) => sum + (Number(it?.quantity ?? 0) || 0), 0);
  }, [items]);

  const totalUniqueItems = items.length;
  const isEmpty = totalUniqueItems === 0;
  const total = typeof cart?.total === "number" ? cart.total : items.reduce((sum: number, it: any) => sum + (it.itemTotal || 0), 0);

  const addItemToCart = React.useCallback(
    async (item: Item, quantity: number) => {
      let c: any;
      try {
        c = await ensureCart();
      } catch {
        return;
      }
      const variantId = (item as any)?.variant_id;
      if (!variantId) return;

      const existing = (Array.isArray(c?.items) ? c.items : []).find((li: any) => li?.variant_id === variantId);
      if (existing?.id) {
        const nextQty = (Number(existing?.quantity ?? 0) || 0) + quantity;
        try {
          const res = await http.post(`/store/carts/${c.id}/line-items/${existing.id}`, { quantity: nextQty });
          const next = res?.data?.cart;
          if (next?.id) setCart(next);
        } catch {}
        return;
      }

      try {
        const res = await http.post(`/store/carts/${c.id}/line-items`, { variant_id: variantId, quantity });
        const next = res?.data?.cart;
        if (next?.id) setCart(next);
      } catch {}
    },
    [ensureCart]
  );

  const removeItemFromCart = React.useCallback(
    async (id: Item["id"]) => {
      let c: any;
      try {
        c = await ensureCart();
      } catch {
        return;
      }
      const existing = (Array.isArray(c?.items) ? c.items : []).find((li: any) => li?.id === id);
      if (!existing?.id) return;
      const nextQty = (Number(existing?.quantity ?? 0) || 0) - 1;
      if (nextQty <= 0) {
        try {
          const res = await http.delete(`/store/carts/${c.id}/line-items/${existing.id}`);
          const next = res?.data?.cart ?? res?.data?.parent ?? res?.data;
          if (next?.id) setCart(next);
        } catch {}
        return;
      }
      try {
        const res = await http.post(`/store/carts/${c.id}/line-items/${existing.id}`, { quantity: nextQty });
        const next = res?.data?.cart ?? res?.data?.parent ?? res?.data;
        if (next?.id) setCart(next);
      } catch {}
    },
    [ensureCart]
  );

  const clearItemFromCart = React.useCallback(
    async (id: Item["id"]) => {
      let c: any;
      try {
        c = await ensureCart();
      } catch {
        return;
      }
      try {
        const res = await http.delete(`/store/carts/${c.id}/line-items/${id}`);
        const next = res?.data?.cart ?? res?.data?.parent ?? res?.data;
        if (next?.id) setCart(next);
      } catch {}
    },
    [ensureCart]
  );

  const isInCart = (id: Item["id"]) => !!getItem(items as any, id);
  const getItemFromCart = (id: Item["id"]) => getItem(items as any, id);

  const placeOrder = React.useCallback(
    async (input: {
      email: string;
      shipping_address: any;
      billing_address?: any;
      shipping_option_id?: string;
      payment_provider_id?: string;
    }) => {
      const c = await ensureCart();
      if (!c?.id) throw new Error("Cart not found");

      const resCart = await http.post(`/store/carts/${c.id}`, {
        email: input.email,
        shipping_address: input.shipping_address,
        billing_address: input.billing_address ?? input.shipping_address,
      });
      const updatedCart = resCart?.data?.cart;
      if (updatedCart?.id) setCart(updatedCart);

      let shippingOptionId = input.shipping_option_id;
      if (!shippingOptionId) {
        const resShip = await http.get(`/store/shipping-options`, { params: { cart_id: c.id } });
        const options = Array.isArray(resShip?.data?.shipping_options) ? resShip.data.shipping_options : [];
        shippingOptionId = options?.[0]?.id;
      }
      if (!shippingOptionId) {
        const regionId = String(updatedCart?.region_id ?? c?.region_id ?? "").trim() || (await resolveRegionId()) || "";
        let salesChannelId =
          String(updatedCart?.sales_channel_id ?? c?.sales_channel_id ?? "").trim() ||
          (await resolveSalesChannelId()) ||
          "";
        if (!salesChannelId) {
          try {
            const resStore = await http.get(`/store/store`);
            const store = resStore?.data?.store ?? resStore?.data;
            salesChannelId = String(store?.default_sales_channel_id ?? "").trim() || "";
          } catch {}
        }
        throw new Error(
          `No shipping options available for this cart. (cart_id=${c.id}${
            regionId ? `, region_id=${regionId}` : ""
          }${salesChannelId ? `, sales_channel_id=${salesChannelId}` : ""})`
        );
      }
      const resShipMethod = await http.post(`/store/carts/${c.id}/shipping-methods`, { option_id: shippingOptionId });
      const cartWithShipping = resShipMethod?.data?.cart;
      if (cartWithShipping?.id) setCart(cartWithShipping);
      const methods = Array.isArray(cartWithShipping?.shipping_methods) ? cartWithShipping.shipping_methods : [];
      if (!methods.length) {
        throw new Error("Shipping method could not be applied to this cart.");
      }

      const resPayColl = await http.post(`/store/payment-collections`, { cart_id: c.id });
      const paymentCollection = resPayColl?.data?.payment_collection;
      const paymentCollectionId = paymentCollection?.id;

      let providerId = input.payment_provider_id;
      if (!providerId) {
        try {
          const regionId = String(updatedCart?.region_id ?? c?.region_id ?? "").trim() || (await resolveRegionId());
          if (regionId) {
            const resProviders = await http.get(`/store/payment-providers`, {
              params: { region_id: regionId },
            });
            const providers = Array.isArray(resProviders?.data?.payment_providers) ? resProviders.data.payment_providers : [];
            providerId = providers?.[0]?.id || 'pp_system_default';
          } else {
            providerId = 'pp_system_default';
          }
        } catch {
          providerId = 'pp_system_default';
        }
      }

      let paymentUrl = "";
      if (paymentCollectionId && providerId) {
        const resSession = await http.post(`/store/payment-collections/${paymentCollectionId}/payment-sessions`, {
          provider_id: providerId,
          data: {
            cart_id: c.id
          },
        });
        const pc = resSession?.data?.payment_collection ?? resSession?.data?.paymentCollection ?? resSession?.data;
        const sessions = Array.isArray(pc?.payment_sessions) ? pc.payment_sessions : [];
        const ngeniusSession = sessions.find(
          (s: any) => s.provider_id === "pp_ngenius_ngenius" || s.provider_id === "pp_ngenius" || s.provider_id === "ngenius" || s.data?.payment_url
        );
        if (ngeniusSession?.data?.payment_url) {
          paymentUrl = ngeniusSession.data.payment_url;
        }
      }

      const resComplete = await http.post(`/store/carts/${c.id}/complete`, {});
      const type = resComplete?.data?.type;
      if (type === "order") {
        setCartId(null);
        setCart(null);
        await ensureCart();
        const order = resComplete?.data?.order;
        const sessions = order?.payment_collections?.[0]?.payment_sessions || [];
        const ngeniusSession = sessions.find(
          (s: any) => s.provider_id === "pp_ngenius_ngenius" || s.provider_id === "pp_ngenius" || s.provider_id === "ngenius" || s.data?.payment_url
        );
        const finalPaymentUrl = ngeniusSession?.data?.payment_url || paymentUrl;
        if (finalPaymentUrl && typeof window !== "undefined") {
          window.location.href = finalPaymentUrl;
        }
        return { type: "order" as const, order, payment_url: finalPaymentUrl };
      }
      const errMsg = String(resComplete?.data?.error?.message ?? "").trim();
      if (errMsg) throw new Error(errMsg);
      throw new Error("Failed to complete cart.");
    },
    [ensureCart, resolveRegionId, resolveSalesChannelId]
  );

  const value = React.useMemo(
    () => ({
      items,
      isEmpty,
      totalItems,
      totalUniqueItems,
      total,
      addItemToCart,
      removeItemFromCart,
      clearItemFromCart,
      getItemFromCart,
      isInCart,
      refreshCart,
      cartId: cart?.id ?? null,
      cart,
      placeOrder,
      isLoading,
    }),
    [
      items,
      isEmpty,
      totalItems,
      totalUniqueItems,
      total,
      addItemToCart,
      removeItemFromCart,
      clearItemFromCart,
      refreshCart,
      cart?.id,
      cart,
      placeOrder,
      isLoading,
    ]
  );

  return <cartContext.Provider value={value} {...props} />;
};
