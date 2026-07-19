import { composeQuestion } from "@/lib/spn/compose-question";
import type { ParsedInput } from "@/lib/mock/parse-user-input";
import type { BrowseResult, FinalResponse, PolicyDecision, Product, RecommendationResponse } from "@/lib/types";

function productName(productId: string | undefined, products: Product[]) {
  return productId ? products.find((product) => product.id === productId)?.title : undefined;
}

export function composeFinalResponse(policy: PolicyDecision, recommendation: RecommendationResponse | null, browseResult: BrowseResult | null, products: Product[], action?: ParsedInput["action"]): FinalResponse {
  if (policy.action === "ask_user") return { message: composeQuestion(policy), productCards: [], priceEvidence: [], deliveryEvidence: [], imageEvidence: [], reviewEvidence: [], nextActions: ["사용 목적 말하기", "예산 말하기"] };
  const top = recommendation?.rankedProducts[0];
  const product = top ? products.find((item) => item.id === top.productId) : undefined;
  const state = recommendation?.updatedDialogueState;
  const message = !product ? "추천 후보를 찾지 못했습니다."
    : action === "reject_first_storage"
      ? (() => {
          const rejected = productName(state?.rejectedItems.at(-1)?.productId, products);
          return `${rejected ?? "기존 1위 제품"}은(는) 저장공간이 작다는 의견을 반영해 후보에서 제외했어요. 대신 ${product.title}을(를) 새 1순위로 추천합니다. ${product.metadata.storage} 저장공간이라 자료와 앱을 더 여유 있게 보관할 수 있고, ${product.price.toLocaleString("ko-KR")}원으로 예산 안에 들어옵니다.`;
        })()
      : action === "inspect_first"
        ? `${product.title}을(를) 상세 확인할 제품으로 저장했어요. ${product.metadata.display} 화면, ${product.metadata.ram} 메모리, ${product.metadata.storage} 저장공간을 갖춘 제품입니다. ${product.description} 현재 조건에서는 이 제품이 계속 1순위예요.`
        : action === "purchase_current"
          ? `${product.title} 구매 의사를 기록했어요. 저장공간과 예산 조건을 반영해 선택한 제품이며, 현재 관심 제품과 구매 이력에도 남아 있습니다. 이 데모는 실제 결제를 진행하지 않는 목업입니다.`
          : action === "compare_first_second"
            ? `${product.title}을(를) 우선 추천합니다. 비교할 두 제품을 관심 목록에 저장했어요. 가격, 저장공간, 리뷰 근거를 카드에서 나란히 확인해 보세요.`
            : `${product.title}을(를) 우선 추천합니다. ${product.price.toLocaleString("ko-KR")}원, ${product.shipping} 조건과 실제 점수에 사용된 리뷰 근거를 함께 확인해 보세요.`;
  return { message, productCards: recommendation?.rankedProducts ?? [], priceEvidence: browseResult?.priceEvidence ?? [], deliveryEvidence: browseResult?.deliveryEvidence ?? [], imageEvidence: browseResult?.images ?? [], reviewEvidence: recommendation?.reviewEvidence ?? [], nextActions: ["첫 번째 제품 자세히 보기", "첫 번째와 두 번째 비교", "저장 공간 조건 조정"] };
}
