import isEmpty from "lodash/isEmpty";

interface Item {
  id: string | number;
  name: string;
  slug: string;
  variant_id?: string;
  image: {
    thumbnail: string;
    [key: string]: unknown;
  };
  price: number;
  sale_price?: number;
  metadata?: any;
  [key: string]: unknown;
}
export function generateCartItem(item: Item, attributes: object) {
  const { id, name, slug, image, price, sale_price, variant_id, metadata } = item;
  return {
    id: variant_id || (!isEmpty(attributes) ? `${id}.${Object.values(attributes).join(".")}` : id),
    name,
    slug,
    image: image.thumbnail,
    price: sale_price ? sale_price : price,
    attributes,
    metadata,
    ...(variant_id ? { variant_id } : {}),
  };
}
