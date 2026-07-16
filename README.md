# SPN Orchestrator / RA-Rec 쇼핑 데모

사용자 발화와 피드백이 **대화 상태 → 숨은 의도 가설 → 다음 행동 → 리뷰 근거 → 점수와 순위 → 최종 응답**으로 이어지는 Next.js 프론트엔드 데모입니다.

실제 LLM, 쇼핑 API, 크롤러, 결제, 서버 데이터베이스는 사용하지 않습니다. 모든 처리는 브라우저에서 실행되는 로컬 mock 데이터와 결정론적 TypeScript 함수로 재현됩니다.

## 실행

```powershell
npm ci        # 최초 1회 또는 node_modules를 새로 설치할 때
npm run dev
```

개발 서버가 표시하는 주소(보통 `http://localhost:3000`)를 엽니다.

## 검증

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

## 화면을 읽는 법

| 영역 | 데모에서 보여주는 것 |
| --- | --- |
| 왼쪽: User conversation | 현재 상태에 맞춘 추천 발화와 자유 입력. 상세 보기·거절·비교·구매 행동도 다음 추천에 반영됩니다. |
| 가운데: Live decision trace | 여섯 단계 중 현재 실행 단계와 SPN Policy의 실제 판단 근거, 선택한 질문 또는 추천 판단을 강조합니다. |
| 오른쪽: User insight | 현재 이해한 요구, 숨은 의도 가설, 다음 행동과 이유, State Diff, 리뷰 근거와 상품 점수를 표시합니다. |

SPN은 에메랄드 계열로, RA-Rec은 블루 계열로 표시합니다.

## 처리 흐름

```text
사용자 발화
  → SPN Understanding
  → RA-Rec State Manager (모든 발화 뒤 상태 누적)
  → SPN Policy
     ├─ 정보 부족: 질문 대상과 우선순위 결정
     │    → SPN Response Composer가 자연어 질문 작성
     └─ 정보 충분: RA-Rec Query Generator
          → SPN Browsing Actions (local mock)
          → RA-Rec Recommendation Engine
          → SPN Response Composer
```

### 숨은 의도 가설

화면의 **숨은 의도 가설**은 확정 사실이 아닙니다. 명시한 조건과 대화 행동을 근거로 confidence를 함께 보이는 가설입니다.

예시:

- 첫 태블릿 구매 → 구매 실패 위험을 줄이려는 경향
- 리뷰 선호 → 사회적 증거 중시
- 필기 목적 → 학교 수업용·휴대성/필기 성능 중시 가능성
- 저장공간 거절 → 용량 제약의 우선순위 상승

## 데모 시나리오

1. “태블릿을 처음 사는데… 20만 원 이하였으면 좋겠어요.”
   - 카테고리·예산·첫 구매 맥락을 기록하고, Policy가 사용 목적 질문을 선택합니다.
2. “주로 학교에서 필기할 것 같아요.”
   - 필기 목적과 관련 가설을 추가하고, mock 상품·리뷰를 탐색해 순위를 계산합니다.
3. “첫 번째 제품은 저장 공간이 너무 작아요.”
   - 거절 이유와 저장공간 선호를 상태에 기록하고, 해당 제품을 제외해 재순위화합니다.
4. 상세 보기·비교·구매
   - inspected / shortlisted / purchased 상태를 구분해 기록합니다.

## 구현 범위

이 프로젝트는 프론트엔드 데모입니다. `lib/mock`, `lib/spn`, `lib/rarec`의 코드는 서버 내부 파이프라인이 아니라 화면에 상태 변화와 추천 근거를 재현하기 위한 클라이언트 측 순수 함수입니다.

- `app/page.tsx`: React 상태와 3패널 UI 조립
- `lib/types.ts`: 상태, 리뷰 근거, 랭킹, 숨은 의도 가설 타입
- `lib/mock/*`: 자유 입력 규칙과 동의어
- `lib/spn/*`: SPN 추출, 모호성, Policy, browsing, 응답 구성, 의도 가설
- `lib/rarec/*`: State Manager, 질의 생성, 리뷰·상품 랭킹, 추천 설명
- `data/products.json`, `data/reviews.json`: 로컬 mock 카탈로그와 정규화된 리뷰

`data/scenario.json`, `index.html`, `app.js`, `styles.css`는 이전 프로토타입 참고 파일이며 현재 실행 경로에서는 사용하지 않습니다.
