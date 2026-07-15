import { composeQuestion } from "@/lib/spn/compose-question";
import type { BrowseResult, FinalResponse, PolicyDecision, Product, RecommendationResponse } from "@/lib/types";

export function composeFinalResponse(policy: PolicyDecision, recommendation: RecommendationResponse | null, browseResult: BrowseResult | null, products: Product[]): FinalResponse {
  if (policy.action === "ask_user") return { message: composeQuestion(policy), productCards: [], priceEvidence: [], deliveryEvidence: [], imageEvidence: [], reviewEvidence: [], nextActions: ["사용 목적 말하기", "예산 말하기"] };
  const top = recommendation?.rankedProducts[0];
  const product = top ? products.find((item) => item.id === top.productId) : undefined;
  const message = product ? `${product.title}을(를) 우선 추천합니다. ${product.price.toLocaleString("ko-KR")}원, ${product.shipping} 조건과 실제 점수에 사용된 리뷰 근거를 함께 확인해 보세요.` : "추천 후보를 찾지 못했습니다.";
  return { message, productCards: recommendation?.rankedProducts ?? [], priceEvidence: browseResult?.priceEvidence ?? [], deliveryEvidence: browseResult?.deliveryEvidence ?? [], imageEvidence: browseResult?.images ?? [], reviewEvidence: recommendation?.reviewEvidence ?? [], nextActions: ["첫 번째 제품 자세히 보기", "첫 번째와 두 번째 비교", "저장 공간 조건 조정"] };
}
