import React, { useState, useEffect } from "react";
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

const productGalleryCarouselResponsive = {
  "768": {
    slidesPerView: 2,
  },
  "0": {
    slidesPerView: 1,
  },
};

const ProductSingleDetails: React.FC = () => {
  const {
    query: { slug },
  } = useRouter();
  const { width } = useSsrCompatible(useWindowSize(), { width: 0, height: 0 });
  const { data, isLoading, error } = useProductQuery(slug as string);
  const { addItemToCart } = useCart();
  const [attributes, setAttributes] = useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = useState(1);
  const [addToCartLoader, setAddToCartLoader] = useState<boolean>(false);

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
  if (isLoading) return <Loader size="large" text="Loading..." />;
  if (error) return <p>{error.message}</p>;
  if (!data) return <p>Product not found</p>;
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
    toast("Added to the bag", {
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

  function handleAttribute(attribute: any) {
    setAttributes((prev) => ({
      ...prev,
      ...attribute,
    }));
  }

  return (
    <div className="block lg:grid grid-cols-9 gap-x-10 xl:gap-x-14 pt-7 pb-10 lg:pb-14 2xl:pb-20 items-start">
      {width < 1025 ? (
        <Carousel
          pagination={{
            clickable: true,
          }}
          breakpoints={productGalleryCarouselResponsive}
          className="product-gallery"
          buttonGroupClassName="hidden"
        >
          {(Array.isArray(data?.gallery) && data.gallery.length
            ? data.gallery
            : [{ original: "/assets/placeholder/products/product-gallery.svg" }]
          ).map((item: any, index: number) => (
            <SwiperSlide key={`product-gallery-key-${index}`}>
              <div className="col-span-1 transition duration-150 ease-in hover:opacity-90">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item?.original || item?.thumbnail || "/assets/placeholder/products/product-gallery.svg"}
                  alt={`${data?.name}--${index}`}
                  className="object-cover w-full"
                />
              </div>
            </SwiperSlide>
          ))}
        </Carousel>
      ) : (
        <div className="col-span-5 grid grid-cols-2 gap-2.5">
          {(Array.isArray(data?.gallery) && data.gallery.length
            ? data.gallery
            : [{ original: "/assets/placeholder/products/product-gallery.svg" }]
          ).map((item: any, index: number) => (
            <div
              key={index}
              className="col-span-1 transition duration-150 ease-in hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item?.original || item?.thumbnail || "/assets/placeholder/products/product-gallery.svg"}
                alt={`${data?.name}--${index}`}
                className="object-cover w-full"
              />
            </div>
          ))}
        </div>
      )}

      <div className="col-span-4 pt-8 lg:pt-0">
        <div className="pb-7 mb-7 border-b border-gray-300">
          <h2 className="text-heading text-lg md:text-xl lg:text-2xl 2xl:text-3xl font-bold hover:text-black mb-3.5">
            {data?.name}
          </h2>
          <p className="text-body text-sm lg:text-base leading-6 lg:leading-8">
            {data?.description}
          </p>
          <div className="flex items-center mt-5">
            <div className="text-heading font-bold text-base md:text-xl lg:text-2xl 2xl:text-4xl ltr:pr-2 rtl:pl-2 ltr:md:pr-0 rtl:md:pl-0 ltr:lg:pr-2 rtl:lg:pl-2 ltr:2xl:pr-0 rtl:2xl:pl-0">
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
        <div className="flex items-center gap-x-4 ltr:md:pr-32 rtl:md:pl-32 ltr:lg:pr-12 rtl:lg:pl-12 ltr:2xl:pr-32 rtl:2xl:pl-32 ltr:3xl:pr-48 rtl:3xl:pl-48  border-b border-gray-300 py-8">
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
            variant="slim"
            className={cn(
              "w-full md:w-6/12 xl:w-full",
              isOutOfStock && "bg-gray-300 hover:bg-gray-300 text-gray-400 cursor-not-allowed"
            )}
            loading={addToCartLoader}
            disabled={isOutOfStock}
          >
            <span className="py-2 3xl:px-8">
              {isOutOfStock ? "Out of stock" : "Add to cart"}
            </span>
          </Button>
        </div>
        <div className="py-6">
          <ul className="text-sm space-y-5 pb-1">
            <li>
              <span className="font-semibold text-heading inline-block ltr:pr-2 rtl:pl-2">
                Item code:
              </span>
              {data?.item_code || data?.sku || "-"}
            </li>
            <li>
              <span className="font-semibold text-heading inline-block ltr:pr-2 rtl:pl-2">
                Range:
              </span>
              {data?.range || "-"}
            </li>
            <li>
              <span className="font-semibold text-heading inline-block ltr:pr-2 rtl:pl-2">
                Category:
              </span>
              <Link
                href="/"
                className="transition hover:underline hover:text-heading"
              >
                {data?.category?.name}
              </Link>
            </li>
            {data?.tags && Array.isArray(data.tags) && (
              <li className="productTags">
                <span className="font-semibold text-heading inline-block ltr:pr-2 rtl:pl-2">
                  Tags:
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
