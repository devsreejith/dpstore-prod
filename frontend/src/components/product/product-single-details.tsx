import React, { useState, useEffect } from "react";
import ProductImageZoom from "@components/product/product-image-zoom";
import Loader from "@components/ui/loader";
import cn from "classnames";
import Button from "@components/ui/button";
import Counter from "@components/common/counter";
import { useRouter } from "next/router";
import { useProductQuery } from "@framework/product/get-product";
import { getVariations } from "@framework/utils/get-variations";
import usePrice from "@framework/product/use-price";
import { useCart } from "@contexts/cart/cart.context";
import { generateCartItem } from "@utils/generate-cart-item";
import { ProductAttributes } from "./product-attributes";
import Link from "@components/ui/link";
import { toast } from "react-toastify";
import { ROUTES } from "@utils/routes";
import { useWindowSize } from "@utils/use-window-size";
import Carousel from "@components/ui/carousel/carousel";
import { SwiperSlide } from "swiper/react";
import ProductMetaReview from "@components/product/product-meta-review";
import { useSsrCompatible } from "@utils/use-ssr-compatible";
import { useUI } from "@contexts/ui.context";
import { useWishlist } from "@utils/use-wishlist";
import ProductWishIcon from "@components/icons/product-wish-icon";
import { useTranslation } from "next-i18next";
import { getLocalizedName } from "@utils/get-localized-name";

const productGalleryCarouselResponsive = {
  "768": {
    slidesPerView: 2,
  },
  "0": {
    slidesPerView: 1,
  },
};

const ProductSingleDetails: React.FC = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { slug, from } = router.query;
  const isFromDrawerOrWishlist = from === "cart" || from === "wishlist";
  const { width } = useSsrCompatible(useWindowSize(), { width: 0, height: 0 });
  const { data, isLoading, error } = useProductQuery(slug as string);
  const productName = getLocalizedName(data, router.locale);
  const { addItemToCart, isInCart } = useCart();
  const { openCart } = useUI();
  const [attributes, setAttributes] = useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = useState(1);
  const [addToCartLoader, setAddToCartLoader] = useState<boolean>(false);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const productWishlisted = data ? isInWishlist(data.id) : false;

  const [selectedImage, setSelectedImage] = useState(0);

  const cartItemCandidate = data ? generateCartItem({ ...data, name: productName }, attributes) : null;
  const isAlreadyInCart = cartItemCandidate ? isInCart(cartItemCandidate.id) : false;

  const isOutOfStock = data && typeof data.quantity === "number" ? data.quantity <= 0 : false;

  useEffect(() => {
    if (data && typeof data.quantity === "number" && data.quantity <= 0) {
      setQuantity(0);
    } else if (data && typeof data.quantity === "number" && data.quantity > 0 && quantity === 0) {
      setQuantity(1);
    }
  }, [data]);

  const { price, basePrice, discount } = usePrice(
    data && {
      amount: (data.sale_price ? data.sale_price : data.price) * quantity,
      baseAmount: data.price * quantity,
      currencyCode: "AED",
    }
  );

  const images = Array.isArray(data?.gallery) && data.gallery.length
    ? data.gallery
    : data?.image
    ? [data?.image]
    : [{ original: "/assets/placeholder/products/product-gallery.svg", thumbnail: "/assets/placeholder/products/product-gallery.svg" }];

  if (isLoading) return <Loader size="large" text={t('text-loading')} />;
  if (error) return <p>{error.message}</p>;
  if (!data) return <p>{t('text-product-not-found')}</p>;
  const variations = getVariations(data?.variations);

  const variationKeys = Object.keys(variations);
  const hasMeaningfulVariations =
    variationKeys.length > 0 &&
    variationKeys.some((k) => {
      const items: any[] = (variations as any)[k] ?? [];
      if (items.length > 1) return true;
      const only = String(items?.[0]?.value ?? "").trim().toLowerCase();
      return only && only !== "default";
    });

  function addToCart() {
    // to show btn feedback while product carting
    setAddToCartLoader(true);
    setTimeout(() => {
      setAddToCartLoader(false);
    }, 600);

    const item = generateCartItem(data!, attributes);
    addItemToCart(item, quantity);
    toast(t('text-added-to-bag'), {
      progressClassName: "fancy-progress-bar",
      position: width > 768 ? "bottom-right" : "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    console.log(item, "item");
  }

  function buyNow() {
    if (!data) return;
    const item = generateCartItem(data, attributes);
    if (!isInCart(item.id)) {
      addItemToCart(item, quantity);
    }
    router.push(ROUTES.CHECKOUT);
  }

  function proceedToCheckout() {
    if (!data) return;
    const item = generateCartItem(data, attributes);
    if (!isInCart(item.id)) {
      addItemToCart(item, quantity);
    }
    router.push(ROUTES.CHECKOUT);
  }

  function handleGoToCart() {
    openCart();
  }

  function handleAttribute(attribute: any) {
    setAttributes((prev) => ({
      ...prev,
      ...attribute,
    }));
  }

  return (
    <div className="block lg:grid grid-cols-9 gap-x-10 xl:gap-x-14 pt-7 pb-10 lg:pb-14 2xl:pb-20 items-start">
      {width < 1025 ? (
        <div className="relative w-full rounded-lg overflow-hidden aspect-square sm:aspect-[4/3] bg-gray-100">
          <Carousel
            pagination={{
              clickable: true,
            }}
            breakpoints={productGalleryCarouselResponsive}
            className="product-gallery w-full h-full"
            buttonGroupClassName="hidden"
          >
            {images.map((item: any, index: number) => (
              <SwiperSlide key={`product-gallery-key-${index}`}>
                <div className="col-span-1 rounded-lg bg-gray-100 overflow-hidden w-full h-full">
                    <ProductImageZoom
                      src={item?.original || item?.thumbnail || "/assets/placeholder/products/product-gallery.svg"}
                      alt={`${productName}--${index}`}
                      className="w-full aspect-square"
                      zoomScale={2.5}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Carousel>
            {/* Floating Wishlist Button */}
            <button
              type="button"
              onClick={() => toggleWishlist(data)}
              className={cn(
                "absolute bottom-3.5 ltr:right-3.5 rtl:left-3.5 z-10 w-[45px] h-[35px] rounded-md bg-white shadow-md border border-gray-150 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
              )}
              aria-label="Toggle Wishlist"
            >
              <ProductWishIcon
                active={productWishlisted}
                className="w-full h-full"
              />
            </button>
          </div>
        ) : (
          <div className="col-span-5 flex flex-col gap-4">
            <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden aspect-square sm:aspect-[4/3]">
              <ProductImageZoom
                src={images[selectedImage]?.original || images[selectedImage]?.thumbnail || "/assets/placeholder/products/product-gallery.svg"}
                alt={`${productName} - main`}
              className="w-full h-full"
              zoomScale={2.5}
            />
            {/* Floating Wishlist Button */}
            <button
              type="button"
              onClick={() => toggleWishlist(data)}
              className={cn(
                "absolute bottom-3.5 ltr:right-3.5 rtl:left-3.5 z-10 w-[45px] h-[35px] rounded-md bg-white shadow-md border border-gray-150 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
              )}
              aria-label="Toggle Wishlist"
            >
              <ProductWishIcon
                active={productWishlisted}
                className="w-full h-full"
              />
            </button>
          </div>
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {images.map((item: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === index ? "border-[#005844]" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item?.thumbnail || item?.original || "/assets/placeholder/products/product-gallery.svg"}
                    alt={`${productName} thumbnail ${index}`}
                    className="w-full h-full object-cover bg-gray-100"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="col-span-4 pt-8 lg:pt-0">
        <div className="pb-7 mb-7 border-b border-gray-300">
          <h2 className="text-[#005844] uppercase text-xl md:text-2xl lg:text-3xl 2xl:text-4xl font-bold mb-3.5 font-body tracking-wider">
            {productName}
          </h2>
          <div className="flex items-center mt-5">
            <div className="text-[#005844] font-bold text-2xl md:text-3xl lg:text-4xl 2xl:text-5xl ltr:pr-2 rtl:pl-2 ltr:md:pr-0 rtl:md:pl-0 ltr:lg:pr-2 rtl:lg:pl-2 ltr:2xl:pr-0 rtl:2xl:pl-0 font-body">
              {price}
            </div>
            {discount && (
              <span className="line-through font-segoe text-gray-400 text-sm md:text-base lg:text-lg xl:text-xl ltr:pl-2 rtl:pr-2">
                {basePrice}
              </span>
            )}
          </div>
        </div>

        <div className="pb-3 border-b border-gray-300">
          {hasMeaningfulVariations &&
            Object.keys(variations).map((variation) => {
              return (
                <ProductAttributes
                  key={variation}
                  title={variation}
                  attributes={(variations as any)[variation]}
                  active={attributes[variation]}
                  onClick={handleAttribute}
                />
              );
            })}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b border-gray-300 py-8">
          <div className="flex items-center gap-x-4">
            <Counter
              quantity={quantity}
              onIncrement={() => setQuantity((prev) => prev + 1)}
              onDecrement={() =>
                setQuantity((prev) => (prev !== 1 ? prev - 1 : 1))
              }
              disableDecrement={quantity <= 1 || isOutOfStock}
              disableIncrement={isOutOfStock}
            />
          </div>
          <div className="flex-grow flex flex-row gap-3">
            {isFromDrawerOrWishlist ? (
              <Button
                onClick={proceedToCheckout}
                variant="slim"
                className={cn(
                  "flex-1 bg-[#005844] text-white hover:bg-black font-body font-bold rounded-md",
                  isOutOfStock && "bg-gray-300 hover:bg-gray-300 text-gray-400 cursor-not-allowed"
                )}
                disabled={isOutOfStock}
              >
                <span className="py-2">{t('text-proceed-to-checkout')}</span>
              </Button>
            ) : isAlreadyInCart ? (
              <Button
                onClick={handleGoToCart}
                variant="slim"
                className="flex-1 bg-[#005844] text-white hover:bg-black font-body font-bold rounded-md"
              >
                <span className="py-2">{t('text-proceed-to-checkout')}</span>
              </Button>
            ) : (
              <Button
                onClick={addToCart}
                variant="slim"
                className={cn(
                  "flex-1 bg-[#005844] text-white hover:bg-black font-body font-bold rounded-md",
                  isOutOfStock && "bg-gray-300 hover:bg-gray-300 text-gray-400 cursor-not-allowed"
                )}
                loading={addToCartLoader}
                disabled={isOutOfStock}
              >
                <span className="py-2">{t('text-proceed-to-checkout')}</span>
              </Button>
            )}

            <Button
              onClick={buyNow}
              variant="slim"
              className={cn(
                "flex-1 bg-[#005844] text-white hover:bg-black font-body font-bold rounded-md",
                isOutOfStock && "bg-gray-300 hover:bg-gray-300 text-gray-400 cursor-not-allowed"
              )}
              disabled={isOutOfStock}
            >
              <span className="py-2">{t('text-buy-now')}</span>
            </Button>
          </div>
        </div>
        <div className="py-6">
          <ul className="text-sm space-y-5 pb-1 font-body text-black">
            <li>
              <span className="font-bold text-[#005844] inline-block ltr:pr-2 rtl:pl-2">
                {t('text-barcode')}
              </span>
              {data?.item_code || data?.sku || "-"}
            </li>
            <li>
              <span className="font-bold text-[#005844] inline-block ltr:pr-2 rtl:pl-2">
                {t('text-range')}
              </span>
              {data?.range || "-"}
            </li>
            <li>
              <span className="font-bold text-[#005844] inline-block ltr:pr-2 rtl:pl-2">
                {t('text-category')}:
              </span>
              <Link
                href="/"
                className="transition hover:underline hover:text-black uppercase"
              >
                {data?.category?.name}
              </Link>
            </li>
            {data?.tags && Array.isArray(data.tags) && (
              <li className="productTags">
                <span className="font-semibold text-heading inline-block ltr:pr-2 rtl:pl-2">
                  {t('text-tags')}
                </span>
                {data.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`${ROUTES.PRODUCT}?category=${tag.slug}`}
                    className="inline-block ltr:pr-1.5 rtl:pl-1.5 transition hover:underline hover:text-heading ltr:last:pr-0 rtl:last:pl-0"
                  >
                    {tag.name}
                    <span className="text-heading">,</span>
                  </Link>
                ))}
              </li>
            )}
          </ul>
        </div>

        <ProductMetaReview data={data} />
      </div>
    </div>
  );
};

export default ProductSingleDetails;
