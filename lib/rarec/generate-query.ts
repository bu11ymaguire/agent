import type { DialogueState } from "@/lib/types";

export function generateNaturalLanguageQuery(state: DialogueState) {
  const parts = [state.category?.valueText ?? "상품"];
  if (state.subjectiveNeeds.activity) parts.push(state.subjectiveNeeds.activity.valueText);
  if (state.hardConstraints.budget) parts.push(state.hardConstraints.budget.valueText);
  if (state.softConstraints.reviewSignal) parts.push("리뷰가 많은 제품");
  if (state.softConstraints.storagePriority) parts.push(state.softConstraints.storagePriority.valueText);
  return parts.join(" ");
}
