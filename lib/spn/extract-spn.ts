import type { DialogueState, SPNSnapshot } from "@/lib/types";
import { computeVagueness } from "@/lib/spn/compute-vagueness";

export function deriveSPNSnapshot(dialogueState: DialogueState): SPNSnapshot {
  const facets = structuredClone(dialogueState.subjectiveNeeds);
  if (dialogueState.category && !facets.goal_purpose) facets.goal_purpose = { ...dialogueState.category, id: "goal-product-category", valueText: `${dialogueState.category.valueText} 구매` };
  if (dialogueState.softConstraints.reviewSignal && !facets.subjective_property) facets.subjective_property = dialogueState.softConstraints.reviewSignal;
  return { facets, vagueness: computeVagueness(dialogueState, facets) };
}
