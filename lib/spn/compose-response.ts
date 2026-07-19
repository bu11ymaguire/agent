import { composeQuestion } from "@/lib/spn/compose-question";
import type { ParsedInput } from "@/lib/mock/parse-user-input";
import type { BrowseResult, FinalResponse, PolicyDecision, Product, RecommendationResponse } from "@/lib/types";

export function composeFinalResponse(policy: PolicyDecision, recommendation: RecommendationResponse | null, browseResult: BrowseResult | null, products: Product[], action?: ParsedInput["action"]): FinalResponse {
  if (policy.action === "ask_user") return { message: composeQuestion(policy), productCards: [], priceEvidence: [], deliveryEvidence: [], imageEvidence: [], reviewEvidence: [], nextActions: ["사용 목적 말하기", "예산 말하기"] };
  const top = recommendation?.rankedProducts[0];
  const product = top ? products.find((item) => item.id === top.productId) : undefined;
  const message = !product ? "추천 후보를 찾지 못했습니다."
    : action === "reject_first_storage"
      ? `${product.title}은(는) 저장공간을 넉넉히 쓰고 싶을 때 볼 만한 대안이에요. ${product.metadata.storage} 저장공간이라 자료와 앱을 여유 있게 보관할 수 있고, ${product.price.toLocaleString("ko-KR")}원으로 예산 안에 들어옵니다.`
      : action === "inspect_first"
        ? `좋아요. ${product.title}을(를) 자세히 볼게요. ${product.metadata.display} 화면과 ${product.metadata.ram} 메모리, ${product.metadata.storage} 저장공간을 갖췄고, 필기 자료와 기본 앱을 함께 쓰는 용도에 잘 맞습니다. 20만 원 이하 조건에서 저장공간을 우선한다면 괜찮은 선택이에요.`
        : action === "purchase_current"
          ? `좋습니다. ${product.title}을(를) 구매할 제품으로 선택했어요. 현재 관심 제품과 구매 이력에 반영해두었습니다.`
          : action === "compare_first_second"
            ? `${product.title}을(를) 우선 추천합니다. 비교할 두 제품을 관심 목록에 저장했어요. 가격, 저장공간, 리뷰 근거를 카드에서 나란히 확인해 보세요.`
            : `${product.title}을(를) 우선 추천합니다. ${product.price.toLocaleString("ko-KR")}원, ${product.shipping} 조건과 실제 점수에 사용된 리뷰 근거를 함께 확인해 보세요.`;
  return { message, productCards: recommendation?.rankedProducts ?? [], priceEvidence: browseResult?.priceEvidence ?? [], deliveryEvidence: browseResult?.deliveryEvidence ?? [], imageEvidence: browseResult?.images ?? [], reviewEvidence: recommendation?.reviewEvidence ?? [], nextActions: ["첫 번째 제품 자세히 보기", "첫 번째와 두 번째 비교", "저장 공간 조건 조정"] };
}
