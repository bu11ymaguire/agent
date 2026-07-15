import { parseUserInput, type ParsedInput } from "@/lib/mock/parse-user-input";
import type { DialogueState, PreferenceValue, RankedProduct, SPNFacetName, StateDiff } from "@/lib/types";

const facetNames: SPNFacetName[] = ["subjective_property", "event", "activity", "goal_purpose", "goal_audience"];

export function createInitialDialogueState(): DialogueState {
  return {
    hardConstraints: {}, softConstraints: {},
    subjectiveNeeds: Object.fromEntries(facetNames.map((name) => [name, null])) as DialogueState["subjectiveNeeds"],
    tradeoffs: [], recommendedItems: [], shortlistedItems: [], inspectedItems: [], rejectedItems: [], cartedItems: [], purchasedItems: [],
    unresolvedPreferences: [], preferenceHistory: []
  };
}

function preference(id: string, valueText: string, turnId: string, origin: PreferenceValue["origin"] = "explicit", confidence = 1): PreferenceValue {
  return { id, valueText, origin, confidence, status: origin === "inferred" ? "unconfirmed" : "confirmed", evidenceTurnIds: [turnId], updatedAtTurnId: turnId };
}

function upsert<T extends Record<string, PreferenceValue>>(record: T, key: string, value: PreferenceValue, changed: string[]) {
  const previous = record[key];
  if (!previous || previous.valueText !== value.valueText || previous.status !== value.status) changed.push(key);
  return { ...record, [key]: value };
}

function productAt(rankings: RankedProduct[], index: number) { return rankings.find((item) => item.rank === index)?.productId; }

export function updateDialogueState(previous: DialogueState, rawInput: string, rankings: RankedProduct[], turnId: string): { state: DialogueState; diff: StateDiff; parsed: ParsedInput } {
  const parsed = parseUserInput(rawInput);
  const changed: string[] = [];
  const state: DialogueState = structuredClone(previous);
  if (parsed.category) {
    const value = preference("category-tablet", parsed.category, turnId);
    if (!state.category || state.category.valueText !== value.valueText) changed.push("category");
    state.category = value;
  }
  if (parsed.budget) state.hardConstraints = upsert(state.hardConstraints, "budget", preference("budget", `${parsed.budget.toLocaleString("ko-KR")}원 이하`, turnId), changed.map((key) => `hardConstraints.${key}`) as string[]);
  if (parsed.noteTaking) {
    const note = preference("activity-note-taking", "필기와 노트 작성", turnId);
    if (state.subjectiveNeeds.activity?.valueText !== note.valueText) changed.push("subjectiveNeeds.activity");
    state.subjectiveNeeds.activity = note;
    state.softConstraints = upsert(state.softConstraints, "purpose", preference("purpose-note-taking", "필기 중심 사용", turnId), changed.map((key) => `softConstraints.${key}`) as string[]);
  }
  if (parsed.valuesReviewCount) {
    state.softConstraints = upsert(state.softConstraints, "reviewSignal", preference("review-signal", "리뷰 수를 중요하게 봄", turnId), changed.map((key) => `softConstraints.${key}`) as string[]);
    const inferred = preference("risk-attitude", "구매 실패 위험을 낮추고 싶을 가능성", turnId, "inferred", 0.62);
    state.softConstraints = upsert(state.softConstraints, "riskAttitude", inferred, changed.map((key) => `softConstraints.${key}`) as string[]);
  }

  const first = productAt(rankings, 1);
  const second = productAt(rankings, 2);
  if (parsed.action === "inspect_first" && first) {
    state.inspectedItems = [...new Set([...state.inspectedItems, first])];
    state.shortlistedItems = [...new Set([...state.shortlistedItems, first])];
    state.currentItem = first;
    changed.push("inspectedItems", "shortlistedItems", "currentItem");
  }
  if (parsed.action === "reject_first_storage" && first) {
    const reason = preference("storage-too-small", "저장 공간이 너무 작음", turnId);
    state.rejectedItems = [...state.rejectedItems.filter((item) => item.productId !== first), { productId: first, reason }];
    state.softConstraints = upsert(state.softConstraints, "storagePriority", preference("storage-priority", "128GB 이상 저장공간 선호", turnId), changed.map((key) => `softConstraints.${key}`) as string[]);
    changed.push("rejectedItems");
  }
  if (parsed.action === "compare_first_second" && first && second) {
    state.shortlistedItems = [...new Set([...state.shortlistedItems, first, second])];
    changed.push("shortlistedItems");
  }
  if (parsed.action === "purchase_current" && state.currentItem) {
    state.purchasedItems = [...new Set([...state.purchasedItems, state.currentItem])];
    changed.push("purchasedItems");
  }
  const automaticChanges = [
    ...Object.keys(state.hardConstraints).filter((key) => previous.hardConstraints[key]?.valueText !== state.hardConstraints[key].valueText).map((key) => `hardConstraints.${key}`),
    ...Object.keys(state.softConstraints).filter((key) => previous.softConstraints[key]?.valueText !== state.softConstraints[key].valueText || previous.softConstraints[key]?.status !== state.softConstraints[key].status).map((key) => `softConstraints.${key}`)
  ];
  const uniqueChanges = [...new Set([...changed, ...automaticChanges])];
  state.preferenceHistory = [...state.preferenceHistory, { turnId, changedPaths: uniqueChanges }];
  return { state, parsed, diff: { changedPaths: uniqueChanges, summary: uniqueChanges.length ? uniqueChanges.map((path) => `${path} 갱신`) : ["인식 가능한 상태 변경 없음"] } };
}
