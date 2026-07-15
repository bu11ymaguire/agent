"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowDown, Bot, CheckCircle2, CircleHelp, ClipboardList, Search, Send, Star, UserRound } from "lucide-react";
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
import { selectAction } from "@/lib/spn/select-action";
import type { ConversationTurn, DialogueState, Product, RankedProduct, Review } from "@/lib/types";

const products = productsData as Product[];
const reviews = reviewsData as Review[];
const suggestions = [
  "태블릿을 처음 사는데 뭘 보고 골라야 할지 모르겠어요.",
  "20만 원 이하였으면 좋겠고 후기가 많은 게 믿음이 가요.",
  "주로 필기를 많이 할 것 같아요.",
  "첫 번째 제품을 자세히 볼게요.",
  "첫 번째 제품은 저장 공간이 너무 작아요.",
  "첫 번째와 두 번째를 비교해줘.",
  "이 제품으로 살게요."
];

function price(value: number) { return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value); }
function productById(id: string) { return products.find((product) => product.id === id); }

function Step({ title, detail, tone = "emerald", active = false }: { title: string; detail: string; tone?: "emerald" | "blue"; active?: boolean }) {
  return <Card className={cn("border", tone === "emerald" ? "border-emerald-200" : "border-blue-200", active && (tone === "emerald" ? "bg-emerald-50" : "bg-blue-50"))}><CardContent className="p-3"><p className={cn("text-xs font-bold", tone === "emerald" ? "text-emerald-700" : "text-blue-700")}>{title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p></CardContent></Card>;
}

function Flow({ turn }: { turn: ConversationTurn | null }) {
  const policy = turn?.policy;
  return <section className="self-start overflow-hidden rounded-3xl border border-emerald-200 bg-white/95 shadow-panel"><header className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-4"><p className="text-xs font-bold text-emerald-700">Task-level orchestrator</p><h2 className="text-lg font-bold">SPN Shopping Agent</h2><p className="mt-1 text-sm text-emerald-900">Understanding과 Policy가 전체 흐름을 제어하고, RA-Rec은 상태·질의·추천을 담당합니다.</p></header><div className="space-y-2 p-5">
    <Step title="SPN Shopping Agent — Understanding" detail={turn ? `의도: ${turn.diff.summary.join(" · ")}` : "사용자 발화에서 의도, SPN 5 facets, 상태 갱신 후보를 추출합니다."} active />
    <ArrowDown className="mx-auto h-4 w-4 text-emerald-300" />
    <Step title="RA-Rec State Manager" tone="blue" detail={turn ? `모든 발화 뒤 실행 · State Diff: ${turn.diff.changedPaths.join(", ") || "변경 없음"}` : "기존 상태와 새 정보를 병합하고 evidence origin과 행동 이력을 관리합니다."} active={Boolean(turn)} />
    <ArrowDown className="mx-auto h-4 w-4 text-emerald-300" />
    <Step title="SPN Shopping Agent — Policy" detail={policy ? `${policy.action === "ask_user" ? "Ask User" : "Browse and Recommend"} · ${policy.questionTarget?.field ?? "정보 충분"}` : "모호성, 누락 정보, 예상 영향도를 기준으로 다음 행동과 질문 우선순위를 결정합니다."} active={Boolean(turn)} />
    {policy?.action === "ask_user" ? <><ArrowDown className="mx-auto h-4 w-4 text-emerald-300" /><Step title="SPN Response Composer" detail="Policy가 선택한 누락 항목을 자연어 추가 질문으로 표현합니다. RA-Rec은 질문 문장을 생성하지 않습니다." /></> : <><ArrowDown className="mx-auto h-4 w-4 text-emerald-300" /><Step title="RA-Rec Query Generator" tone="blue" detail={turn?.query ?? "현재 상태에서 자연어 검색 질의를 생성합니다."} active={Boolean(turn?.query)} /><ArrowDown className="mx-auto h-4 w-4 text-emerald-300" /><Step title="SPN Browsing Actions" detail={turn?.browseResult ? `mock 상품 ${turn.browseResult.products.length}개 · 리뷰 ${turn.browseResult.reviews.length}개 수집` : "상품, 메타데이터, 리뷰, 이미지, 가격, 배송 근거를 수집합니다."} active={Boolean(turn?.browseResult)} /><ArrowDown className="mx-auto h-4 w-4 text-emerald-300" /><Step title="RA-Rec Recommendation Engine" tone="blue" detail={turn?.recommendation?.explanation ?? "리뷰·제약·메타데이터를 결합해 후보를 순위화합니다."} active={Boolean(turn?.recommendation)} /><ArrowDown className="mx-auto h-4 w-4 text-emerald-300" /><Step title="SPN Response Composer" detail="추천 판단을 가격·배송·이미지·후속 행동과 결합해 사용자 응답으로 만듭니다." active={Boolean(turn?.finalResponse)} /></>}
  </div></section>;
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
  const facets = turn?.snapshot.facets ?? state.subjectiveNeeds;
  return <aside className="self-start overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-panel"><header className="border-b border-slate-100 px-5 py-4"><p className="text-xs font-bold text-slate-400">State, evidence, score</p><h2 className="text-lg font-bold">RA-Rec Dialogue State</h2></header><div className="space-y-4 p-5">
    <Card className="border-blue-200"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ClipboardList className="h-4 w-4 text-blue-600" /> 이번 턴 State Diff</CardTitle></CardHeader><CardContent className="text-xs text-slate-600">{turn?.diff.summary.map((line) => <p key={line}>{line}</p>) ?? <p>아직 입력이 없습니다.</p>}</CardContent></Card>
    <Card className="border-emerald-200"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><CircleHelp className="h-4 w-4 text-emerald-700" /> SPN 5 facets / 모호성</CardTitle></CardHeader><CardContent className="space-y-2 text-xs">{Object.entries(facets).map(([name, value]) => <div key={name} className="rounded bg-emerald-50 p-2"><strong>{name}</strong>: {value ? <><span>{value.valueText}</span> <Badge variant="outline">{value.origin}</Badge></> : "null"}</div>)}{turn && <div className="rounded bg-slate-50 p-2"><strong>모호성 {turn.snapshot.vagueness.total}%</strong><p className="mt-1">{turn.snapshot.vagueness.reasons.join(" / ")}</p></div>}</CardContent></Card>
    <Card className="border-blue-200"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Search className="h-4 w-4 text-blue-600" /> 검색 질의 / 상태 요약</CardTitle></CardHeader><CardContent className="space-y-3"><p className="rounded-lg bg-blue-50 p-2.5 text-xs leading-5 text-blue-900">{turn?.query ?? "Policy가 Ask User를 선택하면 생성하지 않습니다."}</p><div className="grid gap-2 text-xs"><div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5"><span className="font-bold text-slate-500">카테고리</span><p className="mt-1 font-semibold text-slate-800">{state.category?.valueText ?? "아직 확인되지 않음"}</p></div><div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5"><span className="font-bold text-slate-500">하드 제약</span><div className="mt-1 flex flex-wrap gap-1.5">{Object.values(state.hardConstraints).length ? Object.values(state.hardConstraints).map((value) => <Badge key={value.id} variant="outline" className="border-blue-200 bg-white text-blue-700">{value.valueText}</Badge>) : <span>없음</span>}</div></div><div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5"><span className="font-bold text-slate-500">소프트 선호</span><div className="mt-1 space-y-1.5">{Object.values(state.softConstraints).length ? Object.values(state.softConstraints).map((value) => <div key={value.id} className="flex flex-wrap items-center gap-1.5"><span>{value.valueText}</span><Badge variant="outline" className="bg-white">{value.origin}</Badge></div>) : <span>없음</span>}</div></div><div className="grid grid-cols-3 gap-1 text-center"><div className="rounded bg-slate-100 p-2"><strong>{state.inspectedItems.length}</strong><br />상세</div><div className="rounded bg-slate-100 p-2"><strong>{state.shortlistedItems.length}</strong><br />관심</div><div className="rounded bg-slate-100 p-2"><strong>{state.rejectedItems.length}</strong><br />거절</div></div></div><details className="rounded-lg border border-slate-200 bg-white p-2.5"><summary className="cursor-pointer text-xs font-semibold text-slate-600">원시 상태 JSON 보기</summary><pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-950 p-3 text-[10px] leading-4 text-slate-100">{JSON.stringify(state, null, 2)}</pre></details></CardContent></Card>
    {rankings.length ? <><Card className="border-blue-200"><CardHeader className="pb-2"><CardTitle className="text-sm">Top-k Review Evidence</CardTitle></CardHeader><CardContent className="space-y-2">{turn?.recommendation?.reviewEvidence.slice(0, 3).map((review) => <div key={review.id} className="rounded bg-slate-50 p-2 text-xs"><strong>{review.totalScore}점</strong> · {review.text}</div>)}</CardContent></Card>{rankings.map((ranking) => <ProductCard key={ranking.productId} ranking={ranking} previous={previous.get(ranking.productId)} />)}</> : <Card><CardContent className="p-6 text-center text-sm text-slate-500">SPN Policy가 필요한 정보를 수집한 뒤 추천 결과를 표시합니다.</CardContent></Card>}
  </div></aside>;
}

export default function Home() {
  const [state, setState] = useState<DialogueState>(() => createInitialDialogueState());
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [input, setInput] = useState("");
  const [showArchitecture, setShowArchitecture] = useState(true);
  const currentTurn = turns.at(-1) ?? null;
  const canSubmit = input.trim().length > 0;

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
    const finalResponse = composeFinalResponse(policy, recommendation ? { ...recommendation, updatedDialogueState: nextState } : null, browseResult, products);
    const turn: ConversationTurn = { id: turnId, user: text, assistant: finalResponse.message, state: nextState, diff: updated.diff, snapshot, policy, query, browseResult, recommendation, finalResponse, previousRankings };
    setState(nextState); setTurns((items) => [...items, turn]); setInput("");
  };

  return <main className="mx-auto min-h-screen w-full max-w-[1780px] p-4 text-slate-900 md:p-6"><header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/75 px-5 py-4 shadow-panel backdrop-blur"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">State-based mock shopping architecture</p><h1 className="mt-1 text-xl font-bold md:text-2xl">SPN Orchestrator / RA-Rec</h1><p className="mt-1 text-sm text-slate-500">발화가 상태·리뷰 근거·점수·순위를 실제로 바꾸는 결정론적 로컬 mock 데모입니다.</p></div><div className="flex items-center gap-3"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">SPN: Orchestrator</Badge><Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">RA-Rec: State + Ranking</Badge><Switch checked={showArchitecture} onCheckedChange={setShowArchitecture} aria-label="아키텍처 보기" /></div></header><div className={cn("grid gap-4", showArchitecture ? "xl:grid-cols-[minmax(340px,0.85fr)_minmax(420px,1fr)_minmax(390px,0.95fr)]" : "mx-auto max-w-4xl")}>
    <section className="grid h-[720px] max-h-[calc(100vh-2rem)] self-start grid-rows-[auto_1fr_auto] overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-panel xl:sticky xl:top-4"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-xs font-bold text-slate-400">User conversation</p><h2 className="text-lg font-bold">태블릿 쇼핑 상담</h2></div><Button variant="outline" size="sm" onClick={() => { setState(createInitialDialogueState()); setTurns([]); }}>데모 재설정</Button></header><div className="space-y-5 overflow-auto p-5 scrollbar-thin">{turns.length ? turns.map((turn) => <div key={turn.id} className="space-y-3"><div className="flex justify-end gap-3"><div className="max-w-[86%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-6 text-white">{turn.user}</div><UserRound className="mt-2 h-5 w-5 text-slate-400" /></div><div className="flex gap-3"><Bot className="mt-2 h-5 w-5 text-blue-600" /><div className="max-w-[86%] rounded-2xl rounded-bl-md border border-slate-200 px-4 py-3 text-sm leading-6">{turn.assistant}</div></div></div>) : <div className="grid h-full place-items-center text-center text-sm leading-6 text-slate-500">추천 버튼 또는 자유 입력으로 시작하세요.<br />입력은 고정 턴이 아니라 현재 상태를 바꿉니다.</div>}</div><footer className="border-t border-slate-100 p-4"><div className="mb-3 flex flex-wrap gap-2">{suggestions.map((suggestion) => <Button key={suggestion} type="button" variant="outline" size="sm" onClick={() => processInput(suggestion)}>{suggestion}</Button>)}</div><div className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") processInput(input); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="예: 20만 원 이하였으면 좋겠어요." /><Button type="button" size="icon" disabled={!canSubmit} onClick={() => processInput(input)}><Send className="h-4 w-4" /></Button></div><p className="mt-2 text-center text-xs text-slate-400">모든 상품·리뷰·점수는 설명용 local mock 데이터입니다.</p></footer></section>{showArchitecture && <Flow turn={currentTurn} />}{showArchitecture && <MemoryPanel turn={currentTurn} state={state} />}</div></main>;
}
