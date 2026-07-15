import type { BrowseResult, DialogueState, Product, Review } from "@/lib/types";

function budgetValue(state: DialogueState) {
  const text = state.hardConstraints.budget?.valueText ?? "";
  const match = text.match(/[\d,]+/);
  return match ? Number(match[0].replace(/,/g, "")) : undefined;
}

export function browseMockCatalog(query: string, state: DialogueState, products: Product[], reviews: Review[]): BrowseResult {
  const budget = budgetValue(state);
  const category = state.category?.valueText;
  const filtered = products.filter((product) => (!category || product.metadata.category === category) && (!budget || product.price <= budget));
  const visibleProducts = filtered.length ? filtered : products.filter((product) => !category || product.metadata.category === category);
  const productIds = new Set(visibleProducts.map((product) => product.id));
  return {
    products: visibleProducts,
    reviews: reviews.filter((review) => productIds.has(review.productId)),
    images: visibleProducts.map((product) => product.image),
    priceEvidence: visibleProducts.map((product) => `${product.title}: ${product.price.toLocaleString("ko-KR")}원 (mock)`),
    deliveryEvidence: visibleProducts.map((product) => `${product.title}: ${product.shipping} / ${product.stock}`)
  };
}
