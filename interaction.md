# 4단계 상호작용 시나리오

이 문서는 발표용 데모에서 **사용자 발화가 SPN과 RA-Rec의 어떤 기능을 활성화하는지**를 코드 기준으로 설명합니다. 이 앱은 외부 모델이나 쇼핑 API 없이 로컬 mock 데이터와 결정론적 규칙으로 동작합니다.

## 먼저: 4단계와 현재 전송 버튼의 관계

발표에서는 아래 네 장면으로 설명하는 것이 가장 자연스럽습니다.

1. 첫 구매와 예산을 말한다.
2. 필기 목적을 구체화한다.
3. 저장 공간 문제로 첫 추천을 거절한다.
4. 남은 후보를 상세 확인하고 구매를 결정한다.

현재 화면의 `다음 대화 진행` 버튼은 마지막 장면을 **상세 확인**과 **구매 결정**으로 나누므로, 실제로는 총 5회 전송됩니다. 네 번째 상호작용은 두 개의 연속 UI 이벤트로 구성된 하나의 의사결정 장면입니다. 이 문서는 기능적 흐름을 기준으로 네 단계로 묶어 설명합니다.

## State Diff와 DialogueState JSON

오른쪽 Inspector는 같은 상태를 두 시점으로 나누어 보여줍니다.

- **이번 턴 State Diff**: 직전 상태와 비교해 이번 발화가 바꾼 경로만 `+`로 보여줍니다. “무엇이 새로 반영되었는가”를 빠르게 설명하기 위한 뷰입니다.
- **DialogueState JSON**: RA-Rec이 실제로 보관하는 누적 `DialogueState` 객체 전체입니다. 각 자연어 값은 단순 문자열이 아니라 `valueText`, `origin`, `confidence`, `status`, `evidenceTurnIds`, `updatedAtTurnId`를 함께 가진 구조화된 값으로 저장됩니다.

예를 들어 예산은 다음처럼 사용자 표현과 근거 turn을 잃지 않은 채 JSON 상태에 남습니다.

```json
{
  "hardConstraints": {
    "budget": {
      "valueText": "200,000원 이하",
      "origin": "explicit",
      "confidence": 1,
      "status": "confirmed",
      "evidenceTurnIds": ["turn-1"],
      "updatedAtTurnId": "turn-1"
    }
  }
}
```

따라서 Diff는 변화의 설명, JSON은 자연어 기반 상태 관리의 구현 증거를 담당합니다. JSON 카드는 화면 밀도를 유지하기 위해 기본적으로 접혀 있으며, 펼치면 가공하지 않은 현재 상태 전체를 확인할 수 있습니다.

| 단계 | 사용자 맥락 | SPN에서 활성화되는 기능 | RA-Rec에서 활성화되는 기능 | 화면에서 확인할 결과 |
| --- | --- | --- | --- | --- |
| 1 | 첫 태블릿, 20만 원 이하 | 이해, 모호성 판단, 추가 질문 선택, 질문 문장 구성 | 상태 초기 갱신, 예산·첫 구매 근거 저장 | `ASK_USER`, 활동/용도 질문, 첫 State Diff |
| 2 | 학교 필기 용도 | 이해, 추천 행동 선택, 검색 질의 생성, 근거 응답 구성 | 용도 상태 갱신, 로컬 상품·리뷰 탐색, 순위화 | `RECOMMEND`, 검색 질의, 추천·리뷰 근거 |
| 3 | 첫 제품의 저장 공간 거절 | 거절 의미 해석, 재추천 행동 선택, 변경 이유 설명 | 거절 이력과 저장 공간 선호 기록, 후보 제외·재순위화 | 저장 공간 State Diff, 숨은 의도 갱신, 재추천 |
| 4 | 상세 확인 후 구매 결정 | 행동 해석, 최종 응답 구성 | 관심/상세 보기와 구매 이력 저장 | 상세 보기 이력, `currentItem`, 구매 이력 |

## 1. 초기 요청: 예산과 첫 구매 맥락 추출

### 입력

> 태블릿을 처음 사는데 뭘 보고 골라야 할지 모르겠어요. 20만 원 이하였으면 좋겠어요.

### 활성화되는 처리

`parseUserInput`이 태블릿 카테고리, `20만 원 이하` 예산, `처음 사는` 구매 경험을 추출합니다.

- **RA-Rec State Manager**는 `category`, `hardConstraints.budget`, `subjectiveNeeds.goal_audience`, `softConstraints.buyerExperience`를 갱신합니다. 각 값에는 현재 turn ID가 evidence로 붙습니다.
- **SPN Understanding**은 아직 사용 목적이 없다는 점을 포함해 현재 상태의 모호성을 계산합니다.
- **SPN Policy**는 추천을 바로 실행하지 않고, 누락 항목 중 영향도가 가장 높은 `사용 목적`을 질문 대상으로 선택합니다. 현재 정책 우선순위는 사용 목적(25) → 예산(20) → 리뷰 선호(10)입니다.
- **SPN Response Composer**는 Policy의 `ask_user` 결정을 사용자에게 묻는 자연어 질문으로 표현합니다.

### 데모에서 보이는 증거

- 중앙: `사용자 이해 → 상태 갱신 → 행동 결정 → 응답 구성`이 활성화되고, 탐색·추천 생성은 아직 진행하지 않습니다.
- 오른쪽: 예산과 첫 구매자 상태가 `State Diff`로 추가됩니다.
- `DialogueState JSON`: `category`, `hardConstraints.budget`, `subjectiveNeeds.goal_audience`, `softConstraints.buyerExperience`가 각자의 출처와 `turn-1` evidence를 가진 값으로 저장됩니다.
- 오른쪽: “첫 구매이므로 실패 위험을 낮추려는 경향” 같은 숨은 의도 가설이 `inferred / unconfirmed` 상태로 나타납니다.

## 2. 목적 구체화: 질문에서 추천으로 전환

### 입력

> 주로 학교에서 필기할 것 같아요.

### 활성화되는 처리

`parseUserInput`이 필기 관련 표현을 감지합니다.

- **RA-Rec State Manager**는 `subjectiveNeeds.activity`를 필기·노트 작성으로, `softConstraints.purpose`를 필기 중심 사용으로 갱신합니다.
- **SPN Understanding**은 필기 목적이라는 새 명시 근거를 반영합니다. `deriveHiddenIntentHypotheses`는 수업/학습용 필기 및 휴대성 관련 가설을 만듭니다. 이 가설은 추천 제약이 아니라 설명용의 미확정 가설입니다.
- **SPN Policy**는 모호성이 임계값 이하가 되었음을 확인하고 `recommend`를 선택합니다.
- **RA-Rec Query Generator**가 현재 상태를 자연어 검색 질의로 변환합니다.
- **SPN Browsing Actions**가 해당 질의로 로컬 상품·리뷰 데이터를 가져옵니다.
- **RA-Rec Recommendation Engine**이 하드 제약, 소프트 선호, 리뷰 근거를 조합해 후보 점수와 순위를 계산합니다.
- **SPN Response Composer**가 추천 이유, 리뷰 근거, 다음 행동을 자연어 응답으로 만듭니다.

### 데모에서 보이는 증거

- 중앙: `정보 탐색 → 추천 생성 → 응답 구성`까지 실행 경로가 이어집니다.
- 오른쪽: 생성된 검색 질의, 랭킹, Top-k 리뷰 근거, 상품별 점수 설명이 나타납니다.
- 오른쪽: `activity`와 `purpose`의 State Diff가 사용자 발화의 evidence와 함께 추가됩니다.
- `DialogueState JSON`: `subjectiveNeeds.activity`와 `softConstraints.purpose`가 자연어 `valueText` 및 `turn-2` evidence와 함께 누적됩니다.

## 3. 추천 피드백: 거절을 선호로 전환하고 재추천

### 입력

> 첫 번째 제품은 저장 공간이 너무 작아요.

### 활성화되는 처리

이 발화는 단순한 불만이 아니라 현재 1위 제품에 대한 거절 행동으로 해석됩니다.

- **RA-Rec State Manager**는 직전 순위의 1위 제품 ID를 찾아 `rejectedItems`에 거절 사유와 함께 기록합니다.
- 같은 처리에서 `softConstraints.storagePriority`를 `128GB 이상 저장 공간 선호`로 갱신합니다. 이 값은 명시적 발화와 turn ID를 evidence로 가집니다.
- **SPN Understanding**은 저장 공간을 중요한 구매 요인으로 다시 해석하고, 숨은 의도 가설에 “저장 공간 부족 회피”를 추가합니다.
- **SPN Policy**는 상태가 충분히 구체적이므로 다시 `recommend`를 선택합니다.
- **RA-Rec Query Generator / Browsing / Recommendation Engine**이 새 저장 공간 선호를 반영해 탐색과 재순위화를 수행합니다. 거절된 제품은 후보에서 제외됩니다.
- **SPN Response Composer**는 이전 추천 대비 왜 후보가 바뀌었는지를 설명하는 응답을 만듭니다.

### 데모에서 보이는 증거

- `State Diff`: `rejectedItems`, `softConstraints.storagePriority`가 추가됩니다.
- `DialogueState JSON`: 거절된 상품 ID와 그 사유(`reason`)가 `rejectedItems`에 남고, `storagePriority`는 별도의 자연어 선호 값과 `turn-3` evidence로 저장됩니다.
- 상품 카드: 이전 순위와 현재 순위의 차이 및 저장 공간·리뷰 근거를 확인할 수 있습니다.
- 숨은 의도 카드: 저장 공간을 단순 스펙이 아니라 구매 실패 회피 요인으로 해석한 가설을 볼 수 있습니다.

## 4. 후보 행동: 상세 확인과 구매 결정

이 장면은 사용자의 상품 행동이 장기 대화 상태로 남는 것을 보여주기 위한 마무리입니다.

### 4-1. 상세 확인 입력

> 첫 번째 제품을 자세히 볼게요.

- **RA-Rec State Manager**가 현재 순위의 1위 제품을 `inspectedItems`, `shortlistedItems`, `currentItem`에 기록합니다.
- **SPN**은 상품 상세 확인 의도를 해석하고, 현재 후보에 맞는 응답을 구성합니다.
- 추천 경로는 현재 상태를 바탕으로 계속 계산되지만, 이 이벤트의 핵심 State Diff는 관심/상세 보기 이력입니다.

### 4-2. 구매 결정 입력

> 이 제품으로 살게요.

- **RA-Rec State Manager**는 `currentItem`을 `purchasedItems`에 기록합니다.
- **SPN Response Composer**는 선택 완료를 확인하는 응답을 만듭니다.
- 이 이벤트는 새로운 상품 탐색보다 구매 행동 이력을 보존하는 데 초점이 있습니다.

### 데모에서 보이는 증거

- `State Diff`: 먼저 `inspectedItems`, `shortlistedItems`, `currentItem`, 이어서 `purchasedItems`가 나타납니다.
- `DialogueState JSON`: 관심 상품 목록과 현재 선택 상품은 배열/ID로, 구매 결정은 `purchasedItems`로 누적됩니다.
- 이는 단순 슬롯 채우기가 아니라 사용자의 상세 보기·선택 행동도 다음 대화에 참조할 수 있는 상태로 누적된다는 증거입니다.

## 발표용 한 문장 요약

“SPN은 매 발화에서 무엇을 이해하고 다음 행동을 선택할지 결정하며, RA-Rec은 그 결정에 필요한 대화 상태·검색 질의·리뷰 근거·추천 순위를 관리합니다. 특히 거절과 상세 보기 같은 행동도 상태로 남아 다음 추천을 바꿉니다.”
