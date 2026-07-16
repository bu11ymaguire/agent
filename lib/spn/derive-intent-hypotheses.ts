import type { DialogueState, IntentHypothesis } from "@/lib/types";

export function deriveHiddenIntentHypotheses(state: DialogueState): IntentHypothesis[] {
  const hypotheses: IntentHypothesis[] = [];
  const firstTime = state.softConstraints.buyerExperience;
  const noteTaking = state.subjectiveNeeds.activity?.valueText.includes("필기");
  const reviews = state.softConstraints.reviewSignal;
  const storage = state.softConstraints.storagePriority;

  if (noteTaking) hypotheses.push({ id: "study-note-taking", text: "단순 콘텐츠 소비보다 학교 수업용 필기 도구를 찾고 있을 가능성이 높습니다.", confidence: 0.84, evidence: ["필기 중심 사용", "activity"] });
  if (noteTaking) hypotheses.push({ id: "portable-note-taking", text: "필기 반응성과 휴대성이 제품 선택에 중요할 가능성이 높습니다.", confidence: 0.72, evidence: ["필기와 노트 작성", "목적 기반 추론"] });
  if (firstTime) hypotheses.push({ id: "risk-reduction", text: "첫 태블릿 구매이므로 최고 성능보다 구매 실패 위험이 적은 선택을 선호할 가능성이 높습니다.", confidence: 0.76, evidence: [firstTime.valueText, "구매 경험"] });
  if (reviews) hypotheses.push({ id: "social-proof", text: "리뷰가 많은 제품을 선호하므로 사회적 증거를 중요하게 생각합니다.", confidence: 0.9, evidence: [reviews.valueText] });
  if (storage) hypotheses.push({ id: "storage-after-rejection", text: "저장 공간 부족을 경험한 뒤에는 용량 제약이 가격보다 우선할 가능성이 높습니다.", confidence: 0.88, evidence: [storage.valueText, "거절 행동"] });
  return hypotheses;
}
