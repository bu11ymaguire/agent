import { rankReviews } from "@/lib/rarec/rank-reviews";
import type { DialogueState, Product, RankedProduct, Review, ScoreBreakdown } from "@/lib/types";

function numberFrom(text: string) { const digits = text.replace(/[^\d]/g, ""); return digits ? Number(digits) : 0; }
function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function budgetValue(state: DialogueState) { return numberFrom(state.hardConstraints.budget?.valueText ?? "") * (state.hardConstraints.budget ? 1 : 0); }

export function rankProducts(state: DialogueState, products: Product[], reviews: Review[]): { rankedProducts: RankedProduct[]; rankedReviews: ReturnType<typeof rankReviews> } {
  const rejected = new Set(state.rejectedItems.map((item) => item.productId));
  const candidates = products.filter((product) => product.metadata.category === (state.category?.valueText ?? product.metadata.category) && !rejected.has(product.id));
  const rankedReviews = rankReviews(state, candidates, reviews.filter((review) => candidates.some((product) => product.id === review.productId)));
  const maximumReviewCount = Math.max(1, ...candidates.map((product) => product.reviewCount));
  const budget = budgetValue(state);
  const needsNoteTaking = Boolean(state.subjectiveNeeds.activity?.valueText.includes("필기"));
  const needsStorage = Boolean(state.softConstraints.storagePriority);
  const results = candidates.map((product) => {
    const storage = numberFrom(product.metadata.storage);
    const hardConstraintMatch = budget ? (product.price <= budget ? 100 : 0) : 70;
    const metadataMatch = clamp((needsNoteTaking ? (product.metadata.noteTaking ? 85 : 30) : 65) + (needsStorage ? Math.min(25, storage / 8) : 0));
    const subjectiveNeedMatch = clamp((needsNoteTaking ? (product.metadata.noteTaking ? 100 : 25) : 55) + (needsStorage ? Math.min(30, storage / 6) : 0));
    const reviewsForProduct = rankedReviews.filter((review) => review.productId === product.id).sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
    const reviewEvidenceScore = reviewsForProduct.length ? reviewsForProduct.reduce((sum, review) => sum + review.totalScore, 0) / reviewsForProduct.length : 0;
    const helpfulness = reviewsForProduct.length ? reviewsForProduct.reduce((sum, review) => sum + review.reliabilityScore, 0) / reviewsForProduct.length : 0;
    const countReliability = Math.log1p(product.reviewCount) / Math.log1p(maximumReviewCount) * 100;
    const evidenceReliability = clamp(0.7 * helpfulness + 0.3 * countReliability);
    const total = clamp(0.3 * hardConstraintMatch + 0.2 * metadataMatch + 0.25 * subjectiveNeedMatch + 0.2 * reviewEvidenceScore + 0.05 * evidenceReliability);
    const score: ScoreBreakdown = { hardConstraintMatch, metadataMatch, subjectiveNeedMatch, reviewEvidenceScore: clamp(reviewEvidenceScore), evidenceReliability, total };
    const matchedPreferenceIds = [state.hardConstraints.budget?.id, state.subjectiveNeeds.activity?.id, state.softConstraints.reviewSignal?.id, state.softConstraints.storagePriority?.id].filter(Boolean) as string[];
    return { productId: product.id, score, evidenceReviewIds: reviewsForProduct.map((review) => review.id), matchedPreferenceIds };
  }).sort((a, b) => b.score.total - a.score.total || a.productId.localeCompare(b.productId));
  return { rankedProducts: results.map((result, index) => ({ ...result, rank: index + 1 })), rankedReviews };
}
