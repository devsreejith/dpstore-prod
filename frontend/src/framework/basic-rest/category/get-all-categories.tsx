import { CategoriesQueryOptionsType, Category } from "@framework/types";
import http from "@framework/utils/http";
import { API_ENDPOINTS } from "@framework/utils/api-endpoints";
import { useQuery } from "@tanstack/react-query";

function countDescendants(node: any): number {
  const children = Array.isArray(node?.children) ? node.children : [];
  if (!children.length) return 0;
  let count = children.length;
  for (const c of children) {
    count += countDescendants(c);
  }
  return count;
}

function getRootCategories(categories: Category[]) {
  const byId = new Map<string, Category>();
  for (const c of categories) {
    const id = String((c as any)?.id ?? "");
    if (!id) continue;
    const existing = byId.get(id);
    const existingScore = existing ? countDescendants(existing as any) : -1;
    const nextScore = countDescendants(c as any);
    if (!existing || nextScore > existingScore) {
      byId.set(id, c);
    }
  }

  const childIds = new Set<string>();
  const visit = (nodes: any[]) => {
    for (const n of nodes) {
      const id = String(n?.id ?? "");
      if (id) childIds.add(id);
      const children = Array.isArray(n?.children) ? n.children : [];
      if (children.length) visit(children);
    }
  };

  Array.from(byId.values()).forEach((c) => {
    const children = Array.isArray((c as any)?.children) ? (c as any).children : [];
    if (children.length) visit(children);
  });

  const roots: Category[] = [];

  for (const c of Array.from(byId.values())) {
    const id = String((c as any)?.id ?? "");
    if (!id || childIds.has(id)) continue;
    roots.push(c);
  }

  const hydrate = (node: any): any => {
    const id = String(node?.id ?? "");
    const best = (id && byId.get(id)) || node;
    const children = Array.isArray(best?.children) ? best.children : [];
    if (!children.length) return best;
    return { ...best, children: children.map(hydrate) };
  };

  return roots.map(hydrate);
}

function normalizeLimit(input: unknown) {
  const raw = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(raw) || raw <= 0) return 50;
  return Math.max(1, Math.min(100, Math.trunc(raw)));
}

function populateProductCounts(
  category: any,
  categoryProductMap: Map<string, Set<string>>
): Set<string> {
  const selfProducts = categoryProductMap.get(category.id) || new Set<string>();
  const allProducts = new Set<string>(selfProducts);

  if (Array.isArray(category.children)) {
    for (const child of category.children) {
      const childProducts = populateProductCounts(child, categoryProductMap);
      childProducts.forEach((prodId) => {
        allProducts.add(prodId);
      });
    }
  }

  category.productCount = allProducts.size;
  return allProducts;
}

export const fetchCategories = async ({ queryKey }: any) => {
  const [_key, options] = queryKey as [string, CategoriesQueryOptionsType];
  const limit = normalizeLimit(options?.limit);

  const { data } = await http.get(API_ENDPOINTS.CATEGORIES, {
    params: { limit, offset: 0 },
  });
  
  const mappedCategories = (data?.product_categories ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.handle,
      children: c.category_children?.map((child: any) => ({
          id: child.id,
          name: child.name,
          slug: child.handle
      })) ?? []
  }));

  const categories = getRootCategories(mappedCategories as Category[]);

  // Fetch all products with their associated categories to compute counts
  const categoryProductMap = new Map<string, Set<string>>();
  try {
    const { data: prodData } = await http.get('/store/products', {
      params: { limit: 100, fields: "id,categories.id" },
    });
    const products = prodData?.products ?? [];
    for (const p of products) {
      if (Array.isArray(p.categories)) {
        for (const cat of p.categories) {
          if (cat?.id) {
            if (!categoryProductMap.has(cat.id)) {
              categoryProductMap.set(cat.id, new Set());
            }
            categoryProductMap.get(cat.id)!.add(p.id);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error fetching products for category counts:", err);
  }

  // Recursively compute productCount for the hierarchy
  for (const rootCat of categories) {
    populateProductCounts(rootCat, categoryProductMap);
  }

  return {
    categories: {
      data: categories,
    },
  };
};

export const useCategoriesQuery = (options: CategoriesQueryOptionsType) => {
  return useQuery<{ categories: { data: Category[] } }, Error>({
    queryKey: [API_ENDPOINTS.CATEGORIES, options],
    queryFn: fetchCategories,
  });
};
