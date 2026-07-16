# SPN Orchestrator / RA-Rec 시연 가이드

이 데모는 고정된 대화 턴을 재생하지 않습니다. 입력한 문장이 로컬 상태, 리뷰 근거, 상품 점수와 순위를 바꾸는 과정을 보여줍니다.

1. “태블릿을 처음 사는데…”를 입력합니다. State Manager는 category를 누적하고, SPN Policy는 모호성 근거를 보고 사용 목적 질문을 우선합니다.
2. “20만 원 이하… 후기가 많은…”을 입력합니다. explicit 리뷰 선호와 inferred risk attitude가 구분되어 표시되고, Policy가 검색 경로를 선택합니다.
3. “필기를 많이…”를 입력합니다. RA-Rec Query Generator가 상태 기반 질의를 만들고, 필기 관련 메타데이터·리뷰가 높은 제품의 점수가 올라갑니다.
4. “첫 번째 제품은 저장 공간이 너무 작아요”를 입력합니다. 첫 번째 제품의 거절 이유와 저장공간 선호가 State Diff에 기록되고, 일반 랭킹 함수가 128GB/256GB 후보를 다시 계산합니다.
5. “첫 번째를 자세히…”와 “이 제품으로 살게요”를 차례로 입력해 inspected/shortlisted와 purchased 상태가 다름을 확인합니다.

중앙 패널은 **Understanding → State Manager → Policy → Query Generator → Browsing → Recommendation Engine → Response Composer** 흐름을 표시합니다. 정보가 부족한 경우 Query Generator 이후 단계 대신 Response Composer가 Policy 결정을 자연어 질문으로 바꿉니다.

우측 패널은 현재 이해한 사용자 요구, 숨은 의도 가설, 다음 행동과 판단 근거, State Diff 순서로 읽습니다. 숨은 의도는 명시적 조건을 확정 사실로 바꾸지 않고, 근거와 confidence를 가진 가설로 보여줍니다. 중앙 패널은 여섯 단계 중 현재 판단 단계만 강조합니다. 모든 수치와 상품 데이터는 mock입니다.
