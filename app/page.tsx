"use client";

import Image from "next/image";
import { useState } from "react";
import { Bot, Braces, CheckCircle2, CircleHelp, ClipboardList, Send, Star, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import productsData from "@/data/products.json";
import reviewsData from "@/data/reviews.json";
import { createInitialDialogueState, updateDialogueState } from "@/lib/rarec/state-manager";
import { rankProducts } from "@/lib/rarec/rank-products";
import { createRecommendationResponse } from "@/lib/rarec/contracts";
import { generateNaturalLanguageQuery } from "@/lib/rarec/generate-query";
import { browseMockCatalog } from "@/lib/spn/browse";
import { composeFinalResponse } from "@/lib/spn/compose-response";
import { deriveSPNSnapshot } from "@/lib/spn/extract-spn";
import { deriveHiddenIntentHypotheses } from "@/lib/spn/derive-intent-hypotheses";
import { selectAction } from "@/lib/spn/select-action";
import type { ConversationTurn, DialogueState, Product, RankedProduct, Review } from "@/lib/types";

const products = productsData as Product[];
const reviews = reviewsData as Review[];
function nextDemoUtterance(state: DialogueState, turn: ConversationTurn | null) {
  if (!turn) return "태블릿을 처음 사는데 뭘 보고 골라야 할지 모르겠어요. 20만 원 이하였으면 좋겠어요.";
  if (turn.policy.action === "ask_user") return "주로 학교에서 필기할 것 같아요.";
  if (!state.rejectedItems.length) return "첫 번째 제품은 저장 공간이 너무 작아요.";
  if (!state.inspectedItems.length) return "그럼 추천해주신 TECLAST T40을 자세히 볼게요.";
  if (!state.purchasedItems.length) return "이 제품으로 살게요.";
  return null;
}
function price(value: number) { return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value); }
function productById(id: string) { return products.find((product) => product.id === id); }

function Flow({ turn }: { turn: ConversationTurn | null }) {
  const activeIndex = !turn ? 0 : turn.policy.action === "ask_user" ? 2 : 4;
  const steps = [
    { title: "SPN Understanding", owner: "IntentResult", tone: "emerald" },
    { title: "RA-Rec State Update", owner: "DialogueState", tone: "blue" },
    { title: "SPN Policy Selection", owner: "Action", tone: "emerald" },
    { title: "Product & Review Retrieval", owner: "Evidence", tone: "emerald" },
    { title: "RA-Rec Ranking & Evidence", owner: "RankedProducts", tone: "blue" },
    { title: "SPN Response Composition", owner: "FinalResponse", tone: "emerald" }
  ] as const;
  const active = steps[activeIndex];
  const detail = !turn ? "대화를 시작하면 사용자의 구매 맥락과 선호를 파악합니다." : turn.policy.action === "ask_user" ? turn.policy.questionTarget?.reason ?? "추가 정보가 필요합니다." : turn.recommendation?.explanation ?? "리뷰와 제약을 결합해 후보를 계산했습니다.";
  return <section className="self-start overflow-hidden rounded-3xl border border-emerald-200 bg-white/95 shadow-panel"><header className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-4"><p className="text-xs font-bold text-emerald-700">Live decision trace</p><h2 className="text-lg font-bold">SPN Shopping Agent</h2><p className="mt-1 text-sm text-emerald-900">현재 턴에서 에이전트가 내린 판단과 그 근거를 보여줍니다.</p></header><div className="space-y-5 p-5"><div className="grid grid-cols-2 gap-2">{steps.map((step, index) => <div key={step.title} className={cn("rounded-xl border p-3 transition-all", index === activeIndex ? step.tone === "emerald" ? "border-emerald-400 bg-emerald-50 shadow-sm" : "border-blue-400 bg-blue-50 shadow-sm" : "border-slate-200 bg-white opacity-60")}><div className="flex items-center gap-2"><span className={cn("grid h-6 w-6 place-items-center rounded-full text-xs font-bold", index === activeIndex ? step.tone === "emerald" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}>{index + 1}</span><div><p className="text-xs font-bold">{step.title}</p><p className={cn("text-[10px] font-semibold", step.tone === "emerald" ? "text-emerald-700" : "text-blue-700")}>{step.owner}</p></div></div></div>)}</div><div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[10px] font-semibold text-slate-600"><span>UserUtterance</span><span>→</span><span>IntentResult</span><span>→</span><span>DialogueState + Diff</span><span>→</span><span>{turn?.policy.action === "ask_user" ? "Action: ASK_USER" : "Query → Evidence → RankedProducts"}</span></div><Card className={cn("border-2", active.tone === "emerald" ? "border-emerald-300 bg-emerald-50/70" : "border-blue-300 bg-blue-50/70")}><CardHeader className="pb-2"><CardTitle className="text-base">현재 단계: {active.title}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6"><p className="text-slate-700">{detail}</p>{turn?.policy.action === "ask_user" ? <><div className="rounded-lg bg-white/80 p-3"><p className="text-xs font-bold text-slate-500">다음 행동</p><p className="font-bold">사용자에게 추가 질문</p></div><div className="rounded-lg bg-white/80 p-3"><p className="text-xs font-bold text-slate-500">선택된 질문</p><p>{turn.finalResponse.message}</p></div></> : turn?.recommendation ? <><div className="rounded-lg bg-white/80 p-3"><p className="text-xs font-bold text-slate-500">검색 질의</p><p>{turn.query}</p></div><div className="rounded-lg bg-white/80 p-3"><p className="text-xs font-bold text-slate-500">추천 판단</p><p>{turn.recommendation.explanation}</p></div></> : <p className="rounded-lg bg-white/80 p-3 text-slate-600">첫 발화를 입력하면 여기에서 실제 판단을 확인할 수 있습니다.</p>}</CardContent></Card></div></section>;
}

function ProductVisual({ product }: { product: Product }) {
  const [source, setSource] = useState(product.image);
  return <Image src={source} alt={product.title} fill sizes="(max-width: 768px) 100vw, 390px" className="object-cover" onError={() => setSource("/mock-images/tablet-slate.svg")} />;
}
function ProductCard({ ranking, previous }: { ranking: RankedProduct; previous?: RankedProduct }) {
  const product = productById(ranking.productId);
  if (!product) return null;
  const evidence = reviews.filter((review) => ranking.evidenceReviewIds.includes(review.id));
  const changed = previous && previous.rank !== ranking.rank;
  return <Card className="overflow-hidden border-slate-200 bg-white"><div className="relative h-28"><ProductVisual product={product} /><Badge className="absolute left-3 top-3 bg-white text-blue-700">#{ranking.rank} · {ranking.score.total}점</Badge><Badge className="absolute right-3 top-3 bg-slate-900/80 text-white">mock</Badge></div><CardContent className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold leading-5">{product.title}</h3><p className="mt-1 text-xs text-slate-500">{product.brand} · {price(product.price)} · 리뷰 {product.reviewCount.toLocaleString("ko-KR")}개</p></div><div className="flex items-center gap-1 text-xs font-bold text-amber-700"><Star className="h-3.5 w-3.5 fill-amber-500" />{product.rating}</div></div>{changed && <Badge variant="outline" className="border-emerald-300 text-emerald-700">이전 #{previous.rank} → 현재 #{ranking.rank}</Badge>}<div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">{Object.entries(ranking.score).filter(([key]) => key !== "total").map(([key, value]) => <div key={key} className="rounded bg-slate-50 px-2 py-1">{key}: {value}</div>)}</div><div className="space-y-1">{evidence.map((review) => <p key={review.id} className="flex gap-1 text-xs leading-5 text-slate-600"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{review.text}</p>)}</div></CardContent></Card>;
}

function MemoryPanel({ turn, state }: { turn: ConversationTurn | null; state: DialogueState }) {
  const rankings = turn?.recommendation?.rankedProducts ?? [];
  const previous = new Map((turn?.previousRankings ?? []).map((item) => [item.productId, item]));
  const requirements = [["카테고리", state.category?.valueText], ["가격", state.hardConstraints.budget?.valueText], ["주요 용도", state.subjectiveNeeds.activity?.valueText], ["선호", state.softConstraints.reviewSignal?.valueText], ["사용 경험", state.softConstraints.buyerExperience?.valueText], ["저장 공간", state.softConstraints.storagePriority?.valueText]] as const;
  const stateJson = JSON.stringify(state, null, 2);
  return <aside className="self-start space-y-4"><Card className="border-blue-200"><CardHeader className="pb-2"><p className="text-xs font-bold text-slate-400">Pipeline Inspector · State</p><CardTitle className="text-lg">현재 이해한 사용자 요구</CardTitle></CardHeader><CardContent className="grid gap-2 text-xs">{requirements.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5"><span className="font-bold text-slate-500">{label}</span><span className={value ? "font-semibold text-slate-800" : "text-slate-400"}>{value ?? "미확인 · 추가 질문 필요"}</span></div>)}</CardContent></Card><Card className="border-emerald-200"><CardHeader className="pb-2"><p className="text-xs font-bold text-emerald-700">Latent intent</p><CardTitle className="flex items-center gap-2 text-lg"><CircleHelp className="h-5 w-5 text-emerald-700" /> 숨은 의도 가설</CardTitle></CardHeader><CardContent className="space-y-2">{turn?.hiddenIntentHypotheses.length ? turn.hiddenIntentHypotheses.map((hypothesis) => <div key={hypothesis.id} className="rounded-lg bg-emerald-50 p-3 text-xs leading-5"><div className="flex items-start justify-between gap-2"><p className="font-semibold text-emerald-950">{hypothesis.text}</p><Badge variant="outline" className="shrink-0 border-emerald-200 bg-white text-emerald-700">{Math.round(hypothesis.confidence * 100)}%</Badge></div><p className="mt-1 text-emerald-700">Origin: inferred · Status: unconfirmed · Influence: limited</p><p className="mt-1 text-emerald-700">Evidence: {hypothesis.evidence.join(" · ")}</p></div>) : <p className="rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">대화를 시작하면 명시된 조건뿐 아니라 구매 동기에 대한 가설을 함께 보여줍니다.</p>}</CardContent></Card><Card className="border-amber-200"><CardHeader className="pb-2"><p className="text-xs font-bold text-amber-700">Policy decision</p><CardTitle className="text-lg">다음 행동과 판단 근거</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{turn ? <><div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-50 p-2 text-xs"><span>ASK_USER <strong>{turn.policy.action === "ask_user" ? "0.82" : "0.18"}</strong></span><span>RETRIEVE <strong>{turn.policy.action === "recommend" ? "0.86" : "0.41"}</strong></span><span>COMPARE <strong>0.08</strong></span><span>ITEM_QA <strong>0.00</strong></span></div><div className="rounded-lg bg-amber-50 p-3"><strong>다음 행동</strong><p className="mt-1">{turn.policy.action === "ask_user" ? "사용자에게 추가 질문" : "상품과 리뷰를 탐색해 추천 생성"}</p></div><div className="rounded-lg bg-amber-50 p-3"><strong>선택 이유</strong><p className="mt-1">{turn.policy.questionTarget?.reason ?? turn.policy.reasons[0]}</p></div></> : <p className="rounded-lg bg-amber-50 p-3 text-slate-600">첫 발화 이후 Policy가 정보 이득이 높은 행동을 선택합니다.</p>}</CardContent></Card><Card className="border-blue-200"><CardHeader className="pb-2"><p className="text-xs font-bold text-blue-700">State update</p><CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5 text-blue-600" /> 이번 턴 State Diff</CardTitle></CardHeader><CardContent>{turn?.diff.changedPaths.length ? <div className="space-y-1 rounded-lg bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100"><p className="mb-2 text-slate-400">Evidence: {turn.user}</p>{turn.diff.changedPaths.map((path) => <p key={path}><span className="mr-2 text-emerald-400">+</span>{path}</p>)}</div> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">아직 입력이 없습니다.</p>}</CardContent></Card><Card className="border-indigo-200"><CardHeader className="pb-2"><p className="text-xs font-bold text-indigo-700">RA-Rec state store</p><CardTitle className="flex items-center gap-2 text-lg"><Braces className="h-5 w-5 text-indigo-600" /> DialogueState JSON</CardTitle></CardHeader><CardContent><details className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3"><summary className="cursor-pointer text-sm font-semibold text-indigo-950">원시 상태 JSON 보기</summary><p className="mt-2 text-xs leading-5 text-indigo-800"><code>valueText</code>에는 자연어 값을, 나머지 필드에는 출처·신뢰도·상태·turn 근거를 함께 저장합니다.</p><pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-100 scrollbar-thin"><code>{stateJson}</code></pre></details></CardContent></Card>{rankings.length ? <><Card className="border-blue-200"><CardHeader className="pb-2"><CardTitle className="text-sm">Top-k Review Evidence</CardTitle></CardHeader><CardContent className="space-y-2">{turn?.recommendation?.reviewEvidence.slice(0, 3).map((review) => <div key={review.id} className="rounded-xl bg-slate-50 p-2 text-xs"><strong>{review.totalScore}점</strong> · {review.text}</div>)}</CardContent></Card>{rankings.map((ranking) => <ProductCard key={ranking.productId} ranking={ranking} previous={previous.get(ranking.productId)} />)}</> : null}</aside>;
}

export default function Home() {
  const [state, setState] = useState<DialogueState>(() => createInitialDialogueState());
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [showArchitecture, setShowArchitecture] = useState(true);
  const currentTurn = turns.at(-1) ?? null;
  const nextDemoInput = nextDemoUtterance(state, currentTurn);

  const processInput = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const previousRankings = rankProducts(state, products, reviews).rankedProducts;
    const turnId = `turn-${turns.length + 1}`;
    const updated = updateDialogueState(state, text, previousRankings, turnId);
    const snapshot = deriveSPNSnapshot(updated.state);
    const policy = selectAction(updated.state, snapshot);
    const stateWithUnresolved = { ...updated.state, unresolvedPreferences: policy.questionTarget ? [policy.questionTarget] : [] };
    const query = policy.action === "recommend" ? generateNaturalLanguageQuery(stateWithUnresolved) : null;
    const browseResult = query ? browseMockCatalog(query, stateWithUnresolved, products, reviews) : null;
    const recommendation = browseResult ? createRecommendationResponse(stateWithUnresolved, browseResult.products, browseResult.reviews) : null;
    const nextState = recommendation ? { ...stateWithUnresolved, recommendedItems: recommendation.rankedProducts.map((ranking) => ranking.productId) } : stateWithUnresolved;
    const finalResponse = composeFinalResponse(policy, recommendation ? { ...recommendation, updatedDialogueState: nextState } : null, browseResult, products, updated.parsed.action);
    const hiddenIntentHypotheses = deriveHiddenIntentHypotheses(nextState);
    const turn: ConversationTurn = { id: turnId, user: text, assistant: finalResponse.message, state: nextState, diff: updated.diff, snapshot, policy, query, browseResult, recommendation, finalResponse, previousRankings, hiddenIntentHypotheses };
    setState(nextState); setTurns((items) => [...items, turn]);
  };

  return <main className="mx-auto min-h-screen w-full max-w-[1780px] p-4 text-slate-900 md:p-6"><header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/75 px-5 py-4 shadow-panel backdrop-blur"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">State-based mock shopping architecture</p><h1 className="mt-1 text-xl font-bold md:text-2xl">SPN Orchestrator / RA-Rec</h1><p className="mt-1 text-sm text-slate-500">발화가 상태·리뷰 근거·점수·순위를 실제로 바꾸는 결정론적 로컬 mock 데모입니다.</p></div><div className="flex items-center gap-3"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">SPN: Orchestrator</Badge><Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">RA-Rec: State + Ranking</Badge><Switch checked={showArchitecture} onCheckedChange={setShowArchitecture} aria-label="아키텍처 보기" /></div></header><div className={cn("grid gap-4", showArchitecture ? "xl:grid-cols-[minmax(340px,0.85fr)_minmax(420px,1fr)_minmax(390px,0.95fr)]" : "mx-auto max-w-4xl")}>
    <section className="grid h-[720px] max-h-[calc(100vh-2rem)] min-w-0 self-start grid-rows-[auto_1fr_auto] overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-panel xl:sticky xl:top-4"><header className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div className="min-w-0"><p className="text-xs font-bold text-slate-400">User conversation</p><h2 className="truncate text-lg font-bold">태블릿 쇼핑 상담</h2></div><Button className="shrink-0" variant="outline" size="sm" onClick={() => { setState(createInitialDialogueState()); setTurns([]); }}>데모 재설정</Button></header><div className="min-w-0 space-y-5 overflow-auto p-5 scrollbar-thin">{turns.length ? turns.map((turn) => <div key={turn.id} className="space-y-3"><div className="flex justify-end gap-3"><div className="min-w-0 max-w-[86%] break-words rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-6 text-white">{turn.user}</div><UserRound className="mt-2 h-5 w-5 text-slate-400" /></div><div className="flex gap-3"><Bot className="mt-2 h-5 w-5 text-blue-600" /><div className="min-w-0 max-w-[86%] break-words rounded-2xl rounded-bl-md border border-slate-200 px-4 py-3 text-sm leading-6">{turn.assistant}</div></div></div>) : <div className="grid h-full w-full min-w-0 place-items-center px-2 text-center text-sm leading-6 text-slate-500 break-words">대화를 시작하면 에이전트가 구매 목적과 선호를 파악합니다.<br />제품을 선택하거나 거절한 행동도 다음 추천에 반영됩니다.</div>}</div><footer className="border-t border-slate-100 p-4"><div className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"><div className="min-w-0"><p className="text-sm font-semibold text-slate-700">다음 대화 진행</p><p className="mt-0.5 text-xs text-slate-500">전송 버튼을 누르면 현재 단계에 맞는 발화가 이어집니다.</p></div><Button type="button" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={!nextDemoInput} onClick={() => { if (nextDemoInput) processInput(nextDemoInput); }} aria-label="다음 데모 대화 전송"><Send className="h-5 w-5" /></Button></div><p className="mt-2 text-center text-xs text-slate-400">모든 상품·리뷰·점수는 설명용 local mock 데이터입니다.</p></footer></section>{showArchitecture && <Flow turn={currentTurn} />}{showArchitecture && <MemoryPanel turn={currentTurn} state={state} />}</div></main>;
}
