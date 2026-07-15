export type ParsedInput = {
  category?: string;
  budget?: number;
  noteTaking?: boolean;
  valuesReviewCount?: boolean;
  intent: string[];
  action?: "inspect_first" | "reject_first_storage" | "compare_first_second" | "purchase_current";
};

export function parseUserInput(input: string): ParsedInput {
  const normalized = input.replace(/\s+/g, " ").trim();
  const budgetMatch = normalized.match(/(\d+(?:\.\d+)?)\s*만\s*원?\s*(?:이하|미만|정도)?/);
  const hasTablet = /태블릿|tablet/i.test(normalized);
  const noteTaking = /필기|노트|메모/.test(normalized);
  const valuesReviewCount = /후기|리뷰/.test(normalized) && /많|수|믿음|신뢰/.test(normalized);
  let action: ParsedInput["action"];
  if (/첫\s*(번째|제품)|1번/.test(normalized) && /저장|용량|작/.test(normalized)) action = "reject_first_storage";
  else if (/첫\s*(번째|제품)|1번/.test(normalized) && /자세히|상세|볼게/.test(normalized)) action = "inspect_first";
  else if (/첫\s*번째.*두\s*번째|1번.*2번/.test(normalized) && /비교/.test(normalized)) action = "compare_first_second";
  else if (/이 제품|이걸|이것|첫\s*번째/.test(normalized) && /살게|구매|결제/.test(normalized)) action = "purchase_current";

  const intent = [
    hasTablet ? "상품 탐색" : "대화 갱신",
    budgetMatch ? "예산 제약" : "",
    noteTaking ? "사용 목적" : "",
    valuesReviewCount ? "리뷰 선호" : "",
    action ? "상품 행동" : ""
  ].filter(Boolean);

  return { category: hasTablet ? "태블릿" : undefined, budget: budgetMatch ? Math.round(Number(budgetMatch[1]) * 10000) : undefined, noteTaking, valuesReviewCount, intent, action };
}
