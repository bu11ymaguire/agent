# SPN Orchestrator / RA-Rec 상태 기반 데모

로컬 mock 데이터와 결정론적 TypeScript 함수로, 사용자 발화가 **상태 → 리뷰 근거 → 점수 → 순위 → 최종 응답**을 바꾸는 Next.js 데모입니다. 실제 LLM, 쇼핑 API, 크롤러, 결제는 호출하지 않습니다.

## 실행 및 검증

```powershell
npm ci
npm run dev
npx tsc --noEmit
npm run lint
npm run build
```

## 아키텍처

```text
User input
→ SPN Understanding
→ RA-Rec State Manager (모든 발화 뒤 실행)
→ SPN Policy
  ├─ Ask User → SPN Response Composer
  └─ RA-Rec Query Generator → SPN Browsing Actions
     → RA-Rec Recommendation Engine → SPN Response Composer
```

- **SPN Policy**가 모호성, 누락 정보, 질문 우선순위와 다음 행동을 결정합니다.
- **RA-Rec State Manager**는 대화 상태의 단일 진실 공급원으로 explicit / implicit / inferred와 상품 행동 이력을 관리합니다.
- **RA-Rec Query Generator**는 Policy와 Browsing 사이의 독립 단계입니다.
- **SPN Response Composer**만 사용자용 질문과 최종 쇼핑 응답을 만듭니다.
- 상품별 `reviewCount`는 개별 리뷰 점수가 아니라 상품 단위 evidence reliability에만 반영됩니다.

## 주요 파일

| 경로 | 역할 |
| --- | --- |
| `app/page.tsx` | React 세션 상태와 3패널 조립 |
| `lib/types.ts` | 상태, 근거, 랭킹, 서비스 계약 |
| `lib/spn/*` | SPN 추출, 모호성, Policy, query 이후의 browsing, 응답 조합 |
| `lib/rarec/*` | State Manager, query 생성, 리뷰/상품 랭킹, 추천 설명 |
| `lib/mock/*` | 자유 입력 규칙과 동의어 |
| `data/products.json`, `data/reviews.json` | mock 카탈로그와 정규화된 리뷰 |

`data/scenario.json` 및 정적 `index.html`, `app.js`, `styles.css`는 이전 프로토타입 참고 파일이며 현재 데모 실행 경로에서는 사용하지 않습니다.
