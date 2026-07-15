import type { DialogueState, SPNState, VaguenessBreakdown } from "@/lib/types";

export function computeVagueness(state: DialogueState, facets: SPNState): VaguenessBreakdown {
  const reasons: string[] = [];
  let categoryBreadth = 0, missingRequiredInfo = 0, unresolvedSPN = 0, contradictionPenalty = 0;
  if (!state.category) { categoryBreadth = 18; reasons.push("상품 범위가 확인되지 않음: +18"); }
  if (!state.hardConstraints.budget) { missingRequiredInfo += 20; reasons.push("예산이 확인되지 않음: +20"); }
  if (!facets.activity) { missingRequiredInfo += 25; reasons.push("사용 목적이 확인되지 않음: +25"); }
  if (!facets.subjective_property) { unresolvedSPN += 10; reasons.push("주관적 구매 기준이 확인되지 않음: +10"); }
  if (state.softConstraints.reviewSignal) { unresolvedSPN -= 8; reasons.push("리뷰 선호가 확인됨: -8"); }
  if (state.rejectedItems.length > 0 && !state.softConstraints.storagePriority) { contradictionPenalty = 12; reasons.push("거절 이유의 우선순위가 정리되지 않음: +12"); }
  const total = Math.max(0, Math.min(100, categoryBreadth + missingRequiredInfo + unresolvedSPN + contradictionPenalty));
  return { categoryBreadth, missingRequiredInfo, unresolvedSPN, contradictionPenalty, total, threshold: 45, reasons };
}
