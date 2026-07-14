# SPN Orchestrator / RA-Rec Engine 데모 설계

## 1. 목적

`screen`은 SPN Shopping Agent를 상위 쇼핑 오케스트레이터로, RA-Rec을 호출 가능한 대화형 추천 엔진으로 설명하는 프론트엔드 전용 아키텍처 데모다.

실제 웹 탐색, LLM, Python 백엔드, 추천 API를 호출하지 않는다. 로컬 mock 대화와 상품 데이터를 사용해 계층형 호출 관계, 메모리 경계, API 계약을 시각적으로 검증한다.

- Framework: Next.js 15 App Router, React 19
- Styling: Tailwind CSS와 CSS 변수 기반 디자인 토큰
- UI primitives: shadcn/ui 스타일의 `Button`, `Card`, `Badge`, Radix `Switch`
- Icons: Lucide React

## 2. 시스템 계층

```text
User
  ↓
SPN Shopping Agent (Task-level Orchestrator)
  ├─ Task Planning
  ├─ Vagueness Estimation
  ├─ Missing Information Elicitation
  ├─ Browser / Image / Review Tool Use
  ├─ Call Recommendation Engine
  └─ Integrate Final Response
        ↓
     RA-Rec Engine (Recommendation Service)
       ├─ Intent Classification
       ├─ Dialogue State Tracking
       ├─ Preference Memory
       ├─ Review Retrieval
       ├─ Recommendation
       └─ Explanation / QA
        ↓
SPN Final Response
```

SPN은 쇼핑 작업 전체를 계획하고 어떤 도구 또는 서비스를 사용할지 결정한다. RA-Rec은 추천·질문 응답·대화 상태 처리만 담당하는 하위 서비스다. 따라서 두 컴포넌트는 동등한 타임라인 단계가 아니라 `SPN → RA-Rec 호출 → SPN 응답 통합` 관계다.

## 3. 책임 분리

| 책임 | SPN Shopping Agent | RA-Rec Engine |
| --- | --- | --- |
| 제어 범위 | 쇼핑 세션 전체 | 추천 요청 단위 |
| 주요 행동 | Ask User, Browse Products, Fetch Images, Read Reviews, Call Engine, Integrate Response | Update DST, Update Preference Memory, Retrieval, Recommendation, Explanation, QA, Recommendation-specific Follow-up |
| 메모리 | 작업 진행 상황과 도구 결과 | 누적 선호와 추천 제약 |
| 결과 | 사용자에게 보이는 최종 응답 | 순위화한 상품, 리뷰 근거, 설명, 후속 질문 |

SPN의 Planner Action과 RA-Rec의 Engine Action을 별도의 카드로 표시해 전역 작업 계획과 추천 내부 행동이 혼동되지 않게 한다.

## 4. 화면 구조

| 영역 | 내용 |
| --- | --- |
| 좌측: User Conversation | 대화 턴 선택, 예시 응답, mock 대화 진행 |
| 중앙: SPN Shopping Agent | SPN 작업 단계와 그 안에 중첩된 RA-Rec 서비스 호출 |
| 우측: Memory and Results | SPN Working Memory, RA-Rec Preference Memory, 리뷰 근거, 추천 후보 |

중앙 영역은 다음 순서로 렌더링한다.

1. Task Planning
2. Vagueness Estimation
3. Tool Use 또는 Ask User
4. `RecommendationRequest` 생성
5. 중첩된 `RA-Rec Engine` 처리
6. `RecommendationResponse` 수신
7. SPN Final Response 통합

RA-Rec 카드가 SPN 외곽 컨테이너 안에 배치되므로, 사용자가 SPN이 추천 엔진을 호출하는 주체임을 한눈에 알 수 있다.

## 5. 메모리 경계

### SPN Working Memory

SPN은 작업 수행에 필요한 단기 정보를 관리한다.

- Planning Context
- Browser Cache
- Current Page
- Search Results
- Review Images
- Tool Outputs

이 정보는 어떤 페이지를 보았고 어떤 도구가 무엇을 반환했는지 설명한다. 추천 선호의 영구 저장소 역할은 하지 않는다.

### RA-Rec Preference Memory

RA-Rec은 대화 전반에서 재사용할 추천 관련 정보를 관리한다.

- Dialogue State
- Hard Constraints
- Soft Constraints
- Accepted Items
- Rejected Items
- Preference History

JSON 상태 뷰어는 현재 턴에서 바뀐 필드를 강조한다. SPN이 도구를 수행하더라도, 추천 제약과 선호 이력은 RA-Rec 메모리에 누적된다.

## 6. Recommendation Contract

SPN은 실제 API 대신 시각화용 `RecommendationRequest`를 만들어 RA-Rec에 전달한다.

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

RA-Rec은 다음 모양의 `RecommendationResponse`를 반환한다.

```json
{
  "updated_dialogue_state": {},
  "ranked_products": [],
  "review_evidence": [],
  "explanation": "",
  "follow_up_question": null
}
```

두 객체는 API 구현이 아니라 서비스 경계와 전달 데이터를 설명하는 UI 모형이다. 실제 시스템에서는 이 계약을 HTTP, RPC, 함수 호출, 또는 메시지 기반 인터페이스로 구현할 수 있다.

## 7. Mock 시나리오와 상태 전환

`data/scenario.json`은 RA-Rec의 대화 턴, 상태 변화, 리뷰 근거, 후보 상품을 제공한다. `app/page.tsx`의 `agentSnapshots`는 각 턴에서 SPN이 파악한 SPN 태그, 모호성, 필요한 추가 정보, 브라우징 증거를 모형화한다.

- 모호성이 높으면 SPN Planner는 `Ask User`를 우선한다.
- 정보가 충분하면 SPN은 상품·이미지·리뷰 도구를 사용한 것으로 표현한다.
- 각 경우 SPN은 상태와 탐색 증거를 `RecommendationRequest`로 구성한다.
- RA-Rec은 업데이트된 상태, 추천 후보, 리뷰 근거, 설명 또는 후속 질문을 반환한다.
- SPN은 이 결과를 이미지·도구 결과와 결합해 최종 대화 응답으로 표시한다.

## 8. 시각적 규칙과 접근성

- SPN 오케스트레이터와 작업 메모리는 에메랄드 계열을 사용한다.
- RA-Rec 엔진과 선호 메모리는 파랑 계열을 사용한다.
- 서비스 경계는 중첩 컨테이너, `RecommendationRequest`, `RecommendationResponse`, 방향 화살표로 명확히 한다.
- 활성 처리 카드는 `pulseGlow` 애니메이션으로 강조하고, 타이핑 상태는 시간차를 둔 점 애니메이션으로 표현한다.
- 반응형 Grid, `min-w-0`, 독립 스크롤 영역으로 긴 한국어 텍스트와 좁은 화면에 대응한다.
- 대화 항목과 전송 요소는 의미론적 버튼이며, 토글에는 `aria-label`, 상품 이미지에는 `alt` 텍스트를 제공한다.

## 9. 주요 파일

| 파일 | 책임 |
| --- | --- |
| `app/page.tsx` | 계층형 UI, mock SPN 상태, 계약 시각화, 분리 메모리, 추천 결과 |
| `data/scenario.json` | 대화 상태, 리뷰 근거, 추천 후보 mock 데이터 |
| `data/products.json` | 상품 속성, 가격, 이미지, 리뷰 mock 데이터 |
| `app/globals.css` | 전역 토큰, 배경, 애니메이션, 스크롤바 스타일 |
| `tailwind.config.ts` | Tailwind 의미론적 색상, 반경, 패널 그림자 |
| `components/ui/` | 재사용 버튼, 배지, 카드, 스위치 프리미티브 |