# SPN Orchestrator / RA-Rec Engine Demo

SPN 쇼핑 에이전트가 사용자 의도와 작업 흐름을 조율하고, 필요한 시점에 RA-Rec 추천 엔진을 호출하는 과정을 시각화한 Next.js 데모입니다. 실제 브라우저, LLM, 외부 추천 API를 호출하지 않고 `data/*.json`에 있는 mock 데이터로 전체 흐름을 재현합니다.

## GitHub 업로드 전 점검

- `package.json`과 `package-lock.json`이 포함되어 있어 Node.js 의존성은 `npm ci`로 재현할 수 있습니다.
- Python 코드가 없는 Next.js/TypeScript 프로젝트이므로 `requirements.txt`는 필요하지 않습니다.
- `node_modules`, `.next`, `out`, `.env*.local`, `*.tsbuildinfo`는 생성물 또는 로컬 환경 파일이라 `.gitignore`에 포함되어 있습니다.
- `tsconfig.tsbuildinfo`는 TypeScript 증분 빌드 캐시이므로 저장소에서 제거했습니다.
- 현재 빌드는 `npm run build`로 통과했습니다.

## 실행 방법

```powershell
cd screen
npm ci
npm run dev
```

개발 서버가 출력하는 로컬 주소를 브라우저에서 엽니다. 기본값은 `http://localhost:3000`입니다.

## 검증 명령

```powershell
cd screen
npm run build
npm run lint
```

`npm run build`는 프로덕션 빌드와 타입 검사를 수행합니다. `npm run lint`는 ESLint CLI로 Next.js 권장 규칙과 TypeScript 규칙을 검사합니다.

## 주요 파일

| 파일 | 역할 |
| --- | --- |
| `app/page.tsx` | 3패널 UI, SPN/RA-Rec 호출 흐름, mock 상호작용 |
| `app/layout.tsx` | 페이지 메타데이터와 전역 레이아웃 |
| `app/globals.css` | Tailwind 전역 스타일과 애니메이션 |
| `components/ui/*` | 버튼, 카드, 배지, 스위치 UI 컴포넌트 |
| `data/scenario.json` | 대화 상태 변화, 리뷰 근거, 추천 후보 mock 데이터 |
| `data/products.json` | 상품 속성, 가격, 이미지, 리뷰 mock 데이터 |
| `design.md` | 시스템 책임, 메모리 경계, 요청/응답 계약 설계 |
| `explain.md` | 발표 및 시연용 설명 가이드 |
| `index.html`, `app.js`, `styles.css` | Next.js 이전 정적 프로토타입 참고 파일 |

## 데모 구조

```text
사용자
  -> SPN Shopping Agent
       - 질문/모호성 판단
       - 작업 계획 및 도구 사용 여부 결정
       - RecommendationRequest 생성
       - RA-Rec 응답을 최종 대화로 통합
          -> RA-Rec Engine
               - 의도 분류와 대화 상태 갱신
               - 선호 메모리와 리뷰 근거 조회
               - 상품 순위화와 설명 생성
```

자세한 아키텍처는 [design.md](design.md), 시연 흐름은 [explain.md](explain.md)를 참고하세요.
