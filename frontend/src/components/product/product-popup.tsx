import { useState, useEffect } from "react";
import cn from "classnames";
import { useRouter } from "next/router";
import { ROUTES } from "@utils/routes";
import { useUI } from "@contexts/ui.context";
import Button from "@components/ui/button";
import Counter from "@components/common/counter";
import { useCart } from "@contexts/cart/cart.context";
import { ProductAttributes } from "@components/product/product-attributes";
import { generateCartItem } from "@utils/generate-cart-item";
import usePrice from "@framework/product/use-price";
import { getVariations } from "@framework/utils/get-variations";
import { useTranslation } from "next-i18next";
import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";

export default function ProductPopup() {
  const { t } = useTranslation("common");
  const {
    modalData: { data },
    closeModal,
    openCart,
  } = useUI();
  const router = useRouter();
  const { addItemToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [attributes, setAttributes] = useState<{ [key: string]: string }>({});
  const [viewCartBtn, setViewCartBtn] = useState<boolean>(false);
  const [addToCartLoader, setAddToCartLoader] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isOutOfStock = data && typeof data.quantity === "number" ? data.quantity <= 0 : false;

  useEffect(() => {
    if (data && typeof data.quantity === "number" && data.quantity <= 0) {
      setQuantity(0);
    } else if (data && typeof data.quantity === "number" && data.quantity > 0 && quantity === 0) {
      setQuantity(1);
    }
  }, [data]);

  // Mobile Touch Swipe Handlers
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextImage();
    } else if (isRightSwipe) {
      prevImage();
    }
  };

  const { price, basePrice, discount } = usePrice({
    amount: (data.sale_price ? data.sale_price : data.price) * quantity,
    baseAmount: data.price * quantity,
    currencyCode: "AED",
  });
  const variations = getVariations(data.variations);
  const { slug, image, name, description } = data;

  const variationKeys = Object.keys(variations);
  const hasMeaningfulVariations =
    variationKeys.length > 0 &&
    variationKeys.some((k) => {
      const items: any[] = (variations as any)[k] ?? [];
      if (items.length > 1) return true;
      const only = String(items?.[0]?.value ?? "").trim().toLowerCase();
      return only && only !== "default";
    });

  const nextImage = () => {
    if (data?.gallery && data.gallery.length > 1) {
      setActiveImageIndex((prev) => (prev + 1) % data.gallery.length);
    }
  };

  const prevImage = () => {
    if (data?.gallery && data.gallery.length > 1) {
      setActiveImageIndex((prev) => (prev - 1 + data.gallery.length) % data.gallery.length);
    }
  };

  function addToCart() {
    // to show btn feedback while product carting
    setAddToCartLoader(true);
    setTimeout(() => {
      setAddToCartLoader(false);
      setViewCartBtn(true);
    }, 600);
    const item = generateCartItem(data!, attributes);
    addItemToCart(item, quantity);
    console.log(item, "item");
  }

  function navigateToProductPage() {
    closeModal();
    router.push(`${ROUTES.PRODUCT}/${slug}`, undefined, {
      locale: router.locale,
    });
  }

  function handleAttribute(attribute: any) {
    setAttributes((prev) => ({
      ...prev,
      ...attribute,
    }));
  }

  function navigateToCartPage() {
    closeModal();
    setTimeout(() => {
      openCart();
    }, 300);
  }

  const imageSrc =
    image?.original ||
    image?.thumbnail ||
    data?.gallery?.[0]?.original ||
    data?.gallery?.[0]?.thumbnail ||
    "/assets/placeholder/products/product-thumbnail.svg";

  return (
    <div className="rounded-lg bg-white">
      <div className="flex flex-col lg:flex-row w-full md:w-[650px] lg:w-[960px] mx-auto overflow-hidden">
        {/* Left Column (Premium Images Section) */}
        <div className="flex-shrink-0 w-full lg:w-[430px] p-5 flex flex-col justify-start bg-white select-none">
          {/* Main Card Image */}
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="relative w-full h-[360px] md:h-[380px] flex items-center justify-center bg-gray-50 border border-gray-150 rounded-xl overflow-hidden group shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data?.gallery?.[activeImageIndex]?.original || data?.gallery?.[activeImageIndex]?.thumbnail || imageSrc}
              alt={name}
              className="object-contain w-full h-full p-4 transition-all duration-300 transform scale-100 hover:scale-102"
              draggable="false"
            />
            
            {/* Left Floating Arrow */}
            {data?.gallery && data.gallery.length > 1 && (
              <button
                onClick={prevImage}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-black transition-all duration-200"
              >
                <IoChevronBackOutline className="text-lg" />
              </button>
            )}
            
            {/* Right Floating Arrow */}
            {data?.gallery && data.gallery.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-black transition-all duration-200"
              >
                <IoChevronForwardOutline className="text-lg" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Gallery */}
          {data?.gallery && data.gallery.length > 1 && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1.5 scrollbar-thin">
              {data.gallery.map((item: any, idx: number) => (
                <button
                  key={`popup-thumb-key-${idx}`}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-[65px] h-[65px] rounded-lg border-2 overflow-hidden flex-shrink-0 bg-white transition-all duration-200 ${
                    activeImageIndex === idx
                      ? 'border-indigo-600 ring-2 ring-indigo-100 scale-95'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item?.thumbnail || item?.original}
                    alt={`${name}-thumb-${idx}`}
                    className="object-cover w-full h-full"
                    draggable="false"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (Details Section) */}
        <div className="flex flex-col p-5 md:p-8 w-full">
          <div className="pb-5">
            <div
              className="mb-2 md:mb-2.5 block -mt-1.5"
              onClick={navigateToProductPage}
              role="button"
            >
              <h2 className="text-heading text-lg md:text-xl lg:text-2xl font-semibold hover:text-black">
                {name}
              </h2>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
              {!!(data?.item_code || data?.sku) && (
                <span className="flex items-center gap-x-2">
                  <span className="font-semibold text-heading">Item code:</span>
                  <span>{data?.item_code || data?.sku}</span>
                </span>
              )}
              {!!data?.range && (
                <span className="flex items-center gap-x-2">
                  <span className="font-semibold text-heading">Range:</span>
                  <span>{data?.range}</span>
                </span>
              )}
            </div>
            <p className="text-sm leading-6 md:text-body md:leading-7 mt-2">
              {description}
            </p>

            <div className="flex items-center mt-3">
              <div className="text-heading font-semibold text-base md:text-xl lg:text-2xl">
                {price}
              </div>
              {discount && (
                <del className="font-segoe text-gray-400 text-base lg:text-xl ltr:pl-2.5 rtl:pr-2.5 -mt-0.5 md:mt-0">
                  {basePrice}
                </del>
              )}
            </div>
          </div>

          {hasMeaningfulVariations &&
            Object.keys(variations).map((variation) => {
              return (
                <ProductAttributes
                  key={`popup-attribute-key${variation}`}
                  title={variation}
                  attributes={(variations as any)[variation]}
                  active={attributes[variation]}
                  onClick={handleAttribute}
                />
              );
            })}

          <div className="pt-2 md:pt-4">
            <div className="flex items-center justify-between mb-4 gap-x-3 sm:gap-x-4">
              <Counter
                quantity={quantity}
                onIncrement={() => setQuantity((prev) => prev + 1)}
                onDecrement={() =>
                  setQuantity((prev) => (prev !== 1 ? prev - 1 : 1))
                }
                disableDecrement={quantity <= 1 || isOutOfStock}
                disableIncrement={isOutOfStock}
              />
              <Button
                onClick={addToCart}
                variant="flat"
                className={cn(
                  "w-full h-11 md:h-12 px-1.5",
                  isOutOfStock && "bg-gray-300 hover:bg-gray-300 text-gray-400 cursor-not-allowed"
                )}
                loading={addToCartLoader}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? "Out of stock" : t("text-add-to-cart")}
              </Button>
            </div>

            {viewCartBtn && (
              <button
                onClick={navigateToCartPage}
                className="w-full mb-4 h-11 md:h-12 rounded bg-gray-100 text-heading focus:outline-none border border-gray-300 transition-colors hover:bg-gray-50 focus:bg-gray-50"
              >
                {t("text-view-cart")}
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
