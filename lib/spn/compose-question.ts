import type { PolicyDecision } from "@/lib/types";

export function composeQuestion(policy: PolicyDecision) {
  if (!policy.questionTarget) return "어떤 기준을 가장 중요하게 보시는지 알려주세요.";
  if (policy.questionTarget.field === "사용 목적") return "태블릿을 주로 어떤 용도로 쓰실 예정인가요? 필기, 영상 시청, 학습 중 가까운 용도를 알려주시면 후보 순위를 더 정확히 조정할 수 있어요.";
  if (policy.questionTarget.field === "예산") return "생각하시는 예산 상한이 있을까요? 가격 범위를 알면 비교할 후보를 좁힐 수 있어요.";
  return "후기에서 특히 중요하게 보고 싶은 기준이 있을까요? 리뷰 수, 필기 경험, 성능 중에서 골라주세요.";
}
