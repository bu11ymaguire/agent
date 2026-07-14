# SPN Orchestrator / RA-Rec Engine 시연 가이드

## 1. 데모의 목적

이 화면은 대화형 쇼핑에서 **전체 작업을 조율하는 SPN Shopping Agent**와 **추천에 특화된 RA-Rec Engine**의 책임을 분리해 설명합니다. 핵심은 두 컴포넌트가 같은 단계 목록이 아니라, SPN이 필요할 때 RA-Rec을 호출하고 그 결과를 사용자 응답에 통합하는 계층 구조라는 점입니다.

모든 데이터는 로컬 mock입니다. 실제 LLM, 웹 브라우저, 상품 검색, 추천 API는 호출하지 않습니다.

## 2. 화면을 읽는 법

### 왼쪽: User Conversation

태블릿을 처음 구매하는 사용자의 대화를 보여줍니다. 예시 응답을 누르거나 입력창에서 Enter를 누르면 다음 mock 턴으로 진행됩니다. 이전 턴을 선택하면 해당 시점의 SPN 상태와 RA-Rec 요청/응답을 다시 볼 수 있습니다.

`최종 흐름 보기`를 누르면 모든 대화를 한 번에 표시합니다.

### 중앙: SPN Shopping Agent

중앙은 상위 오케스트레이터입니다. 다음 순서로 현재 턴의 작업을 보여줍니다.

1. Task Planning: 다음 작업을 결정합니다.
2. Vagueness Estimation: 부족한 정보와 모호성을 계산합니다.
3. Tool Use 또는 Ask User: 질문을 우선할지, 상품·이미지·리뷰 증거를 사용할지 정합니다.
4. SPN → RA-Rec 호출: `RecommendationRequest`를 생성합니다.
5. RA-Rec Engine 처리: 상태·선호·리뷰 근거로 추천 또는 후속 질문을 만듭니다.
6. RecommendationResponse 수신: 결과를 SPN으로 반환합니다.
7. SPN Final Response: 도구 결과와 추천 결과를 결합해 사용자에게 답합니다.

가운데의 파란 `RA-Rec Engine` 카드는 에메랄드 SPN 컨테이너 안에 중첩되어 있습니다. 이것이 “SPN이 RA-Rec을 호출한다”는 관계를 나타냅니다.

### 오른쪽: Memory and Results

오른쪽은 두 종류의 메모리와 추천 결과를 구분합니다.

| 영역 | 소유자 | 내용 |
| --- | --- | --- |
| SPN Working Memory | SPN | 현재 계획, 브라우저 캐시, 검색 결과, 이미지·도구 출력 |
| RA-Rec Preference Memory | RA-Rec | Dialogue State, 하드/소프트 제약, 수락 상품, 선호 이력 |
| RA-Rec Review Evidence | RA-Rec | 순위화에 사용한 리뷰 근거 |
| 상품 카드 | RA-Rec 결과 | 후보 상품, 가격, 평점, 리뷰 요약, 엔진 점수 |

JSON 상태 뷰어에서는 현재 대화 턴에서 갱신된 필드가 강조됩니다.

## 3. 대화가 추천으로 바뀌는 과정

처음에는 사용자의 조건이 충분하지 않습니다.

```text
사용자: 태블릿을 처음 사보는데, 뭘 보고 골라야 할지 잘 모르겠어요.
```

이 시점에서 SPN은 모호성이 높다고 판단해 상품을 바로 찾기보다 `Ask User`를 선택합니다. RA-Rec은 대화 상태에 “첫 구매”, “선택 기준 미정” 같은 초기 선호를 기록하고 후속 질문을 준비합니다.

사용자가 가격과 리뷰 선호를 말하면 SPN은 필요한 정보를 충족했다고 판단해 상품·이미지·리뷰 도구를 사용한 것으로 표시합니다. 그 증거와 누적된 선호가 `RecommendationRequest`로 RA-Rec에 전달됩니다.

RA-Rec은 다음 정보를 사용합니다.

- Intent Classification: 현재 발화의 목적
- Dialogue State Tracking: 대화 상태의 갱신
- Preference Memory: 가격·리뷰·용도 등 누적 제약
- Review Retrieval: 리뷰 근거
- Recommendation / Explanation: 후보 순위와 이유, 또는 후속 질문

마지막으로 SPN은 추천 결과를 현재 대화 맥락과 결합해 최종 답변으로 표시합니다.

## 4. 요청·응답 계약

SPN과 RA-Rec 사이의 객체는 실제 네트워크 요청이 아니라 서비스 경계를 설명하는 UI 모형입니다.

```json
{
  "task": "recommend | ask_for_information",
  "dialogue_state": {},
  "spn_preferences": [],
  "browser_evidence": {
    "products": [],
    "reviews": [],
    "images": []
  }
}
```

RA-Rec은 갱신된 상태, 순위화한 상품, 리뷰 근거, 설명, 필요하면 후속 질문을 반환합니다.

```json
{
  "updated_dialogue_state": {},
  "ranked_products": [],
  "review_evidence": [],
  "explanation": "",
  "follow_up_question": null
}
```

## 5. 발표 권장 순서

1. 첫 대화 턴에서 높은 모호성과 `Ask User` 행동을 보여줍니다.
2. 중앙 패널에서 SPN이 질문과 도구 사용을 결정하는 상위 주체임을 설명합니다.
3. 가격·리뷰 선호가 생긴 턴으로 이동해 `RecommendationRequest`와 RA-Rec 내부 단계를 보여줍니다.
4. 오른쪽 패널에서 SPN 작업 메모리와 RA-Rec 선호 메모리의 차이를 설명합니다.
5. 리뷰 근거와 상품 카드를 보며, RA-Rec이 선호와 증거를 바탕으로 순위를 만들었음을 보여줍니다.
6. 마지막으로 SPN Final Response가 엔진 결과를 그대로 노출하는 것이 아니라 전체 쇼핑 맥락에 맞게 통합한다는 점을 강조합니다.

## 6. 발표용 핵심 문장

> SPN은 쇼핑 세션 전체를 계획하고, RA-Rec은 추천 요청을 처리하는 하위 서비스입니다. 화면은 두 컴포넌트를 나란한 단계가 아니라 `SPN → RA-Rec 호출 → SPN 응답 통합`의 계층 구조로 보여줍니다.

> 선호는 RA-Rec의 Preference Memory에, 현재 도구 결과와 작업 맥락은 SPN의 Working Memory에 분리해 저장합니다. 따라서 추천 기준과 실행 과정이 서로 섞이지 않습니다.

## 7. 실행 및 확인

```powershell
cd screen
npm run dev
```

발표 전에는 아래 명령으로 프로덕션 빌드를 확인합니다.

```powershell
npm run build
```

더 자세한 구현 설계는 [design.md](design.md)를 참고하세요.