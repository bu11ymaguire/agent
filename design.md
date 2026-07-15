# SPN / RA-Rec 상태 기반 설계

## 책임과 흐름

```text
사용자 발화
→ SPN Understanding: 의도, SPN 5 facets, 상태 갱신 후보
→ RA-Rec State Manager: 상태 병합, evidence origin, 행동 이력, State Diff
→ SPN Policy: 모호성·누락 정보·질문 우선순위·다음 행동
  ├─ 정보 부족 → SPN Response Composer가 질문 표현
  └─ 정보 충분 → RA-Rec Query Generator → SPN Browsing Actions
     → RA-Rec Recommendation Engine → SPN Response Composer
```

State Manager는 정보가 충분한 경우에만 호출되는 모듈이 아니다. 모든 발화 뒤 실행되며 부분 정보도 누적한다. 반대로 어떤 누락 정보를 질문할지와 우선순위는 SPN Policy의 책임이다.

## 상태와 근거

`DialogueState`는 hard/soft constraint, 5-facet subjective needs, rejected/inspected/shortlisted/purchased item, 변경 이력, unresolved preference를 보관한다. `PreferenceValue`는 `explicit | implicit | inferred`, confidence, status, turn evidence를 갖는다.

상세 보기는 inspected/shortlisted/currentItem만 변경한다. 구매 확정만 purchasedItems에 기록한다.

## 랭킹

개별 리뷰 점수는 intent similarity, preference coverage, helpfulness로 계산한다. `reviewCount`는 log-scaled 상품 단위 evidence reliability에만 반영한다.

상품 점수는 hard constraint, metadata, subjective need, top-k review evidence, evidence reliability를 0~100으로 정규화해 합산한다. 상품 ID 보너스나 시나리오 전용 규칙은 두지 않으며, mock fixture 속성과 현재 상태가 순위를 결정한다.

## 서비스 계약

RA-Rec의 `RecommendationResponse`는 업데이트된 상태, RankedProduct, 실제 evidenceReviewIds, 내부 판단 설명을 반환한다. SPN의 `FinalResponse`는 이를 가격·배송·이미지·후속 행동과 결합한 별도 사용자용 문장이다.
