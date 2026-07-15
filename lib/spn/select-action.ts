import type { DialogueState, PolicyDecision, SPNSnapshot } from "@/lib/types";

export function selectAction(state: DialogueState, snapshot: SPNSnapshot): PolicyDecision {
  const missing = [
    !state.subjectiveNeeds.activity ? { field: "사용 목적", reason: "필기·영상·학습 여부가 상품 적합도에 가장 크게 영향을 줍니다.", priority: 25 } : null,
    !state.hardConstraints.budget ? { field: "예산", reason: "가격 범위가 후보군을 크게 바꿉니다.", priority: 20 } : null,
    !state.softConstraints.reviewSignal ? { field: "리뷰 신뢰 기준", reason: "리뷰 근거의 비중을 정해야 합니다.", priority: 10 } : null
  ].filter(Boolean) as DialogueState["unresolvedPreferences"];
  if (snapshot.vagueness.total > snapshot.vagueness.threshold && missing.length) {
    const questionTarget = [...missing].sort((a, b) => b.priority - a.priority)[0];
    return { action: "ask_user", questionTarget, reasons: snapshot.vagueness.reasons };
  }
  return { action: "recommend", reasons: ["현재 상태가 모호성 임계값 이하이므로 검색과 추천을 진행합니다."] };
}
