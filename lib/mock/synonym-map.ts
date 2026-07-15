export const synonymGroups = [
  ["필기", "노트", "메모", "스타일러스"],
  ["후기", "리뷰", "사용기"],
  ["저장공간", "저장", "용량", "64gb", "128gb", "256gb"],
  ["저가", "가성비", "예산", "가격", "부담"],
  ["영상", "콘텐츠", "시청"],
  ["웹서핑", "검색", "인터넷"]
];

export function expandKeywords(words: string[]) {
  const result = new Set(words.map((word) => word.toLowerCase()));
  synonymGroups.forEach((group) => {
    if (group.some((word) => result.has(word))) group.forEach((word) => result.add(word));
  });
  return [...result];
}
