import { Product } from "@framework/types";

export function mapMedusaProduct(medusaProduct: any): Product {
	const price = medusaProduct.variants?.[0]?.calculated_price?.calculated_amount ?? 0;
	return {
		id: medusaProduct.id,
		name: medusaProduct.title,
		slug: medusaProduct.handle,
		description: medusaProduct.description,
		price: price,
		sale_price: price,
		created_at: medusaProduct.created_at,
		quantity: medusaProduct.variants?.[0]?.inventory_quantity ?? 0,
		image: {
			id: medusaProduct.id,
			thumbnail: medusaProduct.thumbnail ?? "",
			original: medusaProduct.thumbnail ?? "",
		},
		gallery: medusaProduct.images?.map((img: any, idx: number) => ({
			id: idx,
			thumbnail: img.url,
			original: img.url,
		})) ?? [],
		sku: medusaProduct.variants?.[0]?.sku,
		variant_id: medusaProduct.variants?.[0]?.id,
		range: medusaProduct.collection?.title,
		category: medusaProduct.categories?.[0] ? {
			id: medusaProduct.categories[0].id,
			name: medusaProduct.categories[0].name,
			slug: medusaProduct.categories[0].handle,
		} : undefined,
		isNewArrival: medusaProduct.metadata?.isNewArrival === true || medusaProduct.metadata?.isNewArrival === "true" || medusaProduct.isNewArrival === true,
		isTrending: medusaProduct.metadata?.trending === true || medusaProduct.metadata?.trending === "true" || medusaProduct.trending === true,
	};
}
