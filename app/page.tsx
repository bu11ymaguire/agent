"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  Bot,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Compass,
  Globe2,
  Loader2,
  Search,
  Send,
  Sparkles,
  Star,
  UserRound,
  Zap,
  type LucideIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import productsData from "@/data/products.json";
import scenarioData from "@/data/scenario.json";

type Product = {
  id: string;
  title: string;
  image: string;
  brand: string;
  price: number;
  rating: number;
  description: string;
  metadata: Record<string, string | string[]>;
  reviews: string[];
};

type DialogueState = {
  category: string;
  hard_constraints: Record<string, string | undefined>;
  soft_constraints: Record<string, string | string[] | undefined>;
  recommended_items: string[];
  accepted_items?: string[];
  current_item?: string;
};

type ScenarioTurn = {
  user: string;
  assistant: string;
  detectedIntent: string[];
  selectedAction: string;
  dialogueState: DialogueState;
  updatedFields: string[];
  retrievedReviews: string[];
  candidateProductIds: string[];
};

type Scenario = {
  turns: ScenarioTurn[];
  suggestions: string[];
};

type AgentSnapshot = {
  spn: string[];
  vagueness: number;
  missingInformation: string[];
  shouldBrowse: boolean;
  browseSummary: string;
  reviewRankSummary: string;
  imageEvidence: string;
};

type OrchestratorStep = {
  title: string;
  icon: LucideIcon;
  action: string;
  detail: string;
};

const products = productsData as unknown as Product[];
const scenario = scenarioData as unknown as Scenario;

const agentSnapshots: AgentSnapshot[] = [
  { spn: ["태블릿", "첫 구매", "선택 기준 미정"], vagueness: 92, missingInformation: ["주요 사용 목적", "예산 범위"], shouldBrowse: false, browseSummary: "탐색 보류: 먼저 구매 맥락을 수집합니다.", reviewRankSummary: "상품 후보가 없어 리뷰 순위화를 시작하지 않습니다.", imageEvidence: "후보 상품이 확정되면 제품·사용자 이미지 증거를 확인합니다." },
  { spn: ["태블릿", "첫 구매", "결정 피로"], vagueness: 84, missingInformation: ["가격 부담 수준", "후기 신뢰 기준"], shouldBrowse: false, browseSummary: "모호성이 높아 정보 수집 질문을 우선합니다.", reviewRankSummary: "후보 탐색 전: 질문으로 제약을 보강합니다.", imageEvidence: "아직 탐색할 제품이 없습니다." },
  { spn: ["저가", "리뷰 수", "입문용 태블릿"], vagueness: 46, missingInformation: ["세부 사용 목적"], shouldBrowse: true, browseSummary: "쇼핑 카탈로그 탐색: 가격·리뷰 수 조건으로 후보 3개를 수집했습니다.", reviewRankSummary: "리뷰 신뢰도와 가격 적합도를 합산해 근거를 순위화합니다.", imageEvidence: "상품 이미지와 기본 사양을 후보별로 확인했습니다." },
  { spn: ["사용 후기", "실사용 안정성", "입문용"], vagueness: 28, missingInformation: [], shouldBrowse: true, browseSummary: "후보 상세 페이지를 탐색해 실사용 리뷰를 수집했습니다.", reviewRankSummary: "사용 용도·가격·안정성 키워드가 많은 리뷰를 상단에 배치합니다.", imageEvidence: "상품 이미지와 리뷰 속 사용 장면을 확인해 용도 적합성을 보강했습니다." },
  { spn: ["리뷰 우선", "낮은 가격", "기본 사용"], vagueness: 14, missingInformation: [], shouldBrowse: true, browseSummary: "상위 후보를 다시 탐색해 가격과 후기 신호를 교차 확인했습니다.", reviewRankSummary: "리뷰 수, 가격 적합도, 사용 목적 일치도를 바탕으로 최종 순위를 생성합니다.", imageEvidence: "후보의 제품 사진과 사용 환경 이미지를 최종 추천 근거에 반영했습니다." },
  { spn: ["관심 상품", "상세 비교", "구매 후속"], vagueness: 8, missingInformation: [], shouldBrowse: true, browseSummary: "선택 상품 상세 탐색을 유지하며 대안 비교를 준비합니다.", reviewRankSummary: "선택 상품의 리뷰 근거를 유지하고 유사 가격대 대안을 비교합니다.", imageEvidence: "선택 상품의 이미지·리뷰 증거를 다음 후속 질문에 재사용합니다." }
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(price);
}

function CodeBlock({ label, data, tone = "slate" }: { label: string; data: unknown; tone?: "slate" | "blue" | "emerald" }) {
  const toneClass = tone === "blue" ? "border-blue-200 bg-blue-950" : tone === "emerald" ? "border-emerald-200 bg-emerald-950" : "border-slate-700 bg-slate-950";
  return <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><pre className={cn("max-h-56 overflow-auto rounded-xl border p-3 text-xs leading-5 text-slate-100 scrollbar-thin", toneClass)}>{JSON.stringify(data, null, 2)}</pre></div>;
}

function JsonViewer({ data, updatedPaths }: { data: DialogueState; updatedPaths: string[] }) {
  const rows = useMemo(() => JSON.stringify(data, null, 2).split("\n").map((line) => {
    const normalized = line.replace(/[",]/g, "").trim();
    const key = normalized.split(":")[0];
    return { line, isUpdated: updatedPaths.some((path) => path.endsWith(key) || line.includes(`"${path.split(".").at(-1)}"`)) };
  }), [data, updatedPaths]);

  return <pre className="max-h-56 overflow-auto rounded-xl border border-blue-200 bg-slate-950 p-3 text-xs leading-5 text-slate-100 scrollbar-thin">{rows.map((row, index) => <div key={`${row.line}-${index}`} className={cn("rounded px-1.5", row.isUpdated && "bg-blue-500/25 text-blue-100")}>{row.line}</div>)}</pre>;
}

function TypingBubble() {
  return <div className="flex items-end gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600"><Bot className="h-4 w-4" /></div><div className="flex h-11 items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 shadow-sm"><span className="typing-dot h-2 w-2 rounded-full bg-slate-400" /><span className="typing-dot h-2 w-2 rounded-full bg-slate-400" /><span className="typing-dot h-2 w-2 rounded-full bg-slate-400" /></div></div>;
}

function MessageBubble({ role, children }: { role: "user" | "assistant"; children: string }) {
  const isUser = role === "user";
  return <div className={cn("flex items-end gap-3", isUser && "justify-end")}>
    {!isUser && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600"><Bot className="h-4 w-4" /></div>}
    <div className={cn("max-w-[86%] whitespace-pre-line rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm", isUser ? "rounded-br-md border-blue-600 bg-blue-600 text-white" : "rounded-bl-md border-slate-200 bg-white text-slate-800")}>{children}</div>
    {isUser && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><UserRound className="h-4 w-4" /></div>}
  </div>;
}

function TimelineNode({ step, active, done }: { step: OrchestratorStep; active: boolean; done: boolean }) {
  const Icon = step.icon;
  return <Card className={cn("border-emerald-200 transition-all", active && "processing-card border-emerald-400 bg-emerald-50", done && "bg-white") }><CardContent className="p-3"><div className="flex gap-3"><div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", active ? "bg-emerald-600 text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">{step.title}</h3><Badge variant={active ? "success" : done ? "outline" : "secondary"}>{active ? "실행 중" : done ? "완료" : "대기"}</Badge></div><p className="mt-1 text-sm font-semibold text-emerald-800">{step.action}</p><p className="mt-1 text-xs leading-5 text-slate-600">{step.detail}</p></div></div></CardContent></Card>;
}

function RARecEngine({ turn, active, done }: { turn: ScenarioTurn; active: boolean; done: boolean }) {
  const action = turn.candidateProductIds.length ? "Recommendation · Explanation" : "Ask Recommendation-specific Follow-up";
  const engineSteps = [
    ["Intent Classification", turn.detectedIntent.join(" · ")],
    ["Update Dialogue State", turn.updatedFields.join(", ") || "변경 없음"],
    ["Preference Memory", "하드·소프트 제약과 수락 상품을 누적"],
    ["Review Retrieval", turn.retrievedReviews.length ? `${turn.retrievedReviews.length}개 리뷰 근거 검색` : "추가 제약 대기"],
    ["Recommendation", turn.candidateProductIds.length ? `${turn.candidateProductIds.length}개 후보 순위화` : "추천 전 정보 수집"],
    ["Explanation / QA", action]
  ];
  return <section className={cn("rounded-2xl border-2 border-blue-300 p-4 transition-colors", active ? "bg-blue-50" : "bg-blue-50/40")}><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Recommendation service</p><h3 className="text-base font-bold text-blue-950">RA-Rec Engine</h3></div><Badge variant={active ? "default" : done ? "success" : "secondary"}>{active ? "처리 중" : done ? "응답 준비" : "호출 대기"}</Badge></div><div className="grid gap-2">{engineSteps.map(([title, detail]) => <div key={title} className="flex gap-2 rounded-xl border border-blue-100 bg-white/85 p-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><div><p className="text-xs font-bold text-blue-950">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-600">{detail}</p></div></div>)}</div></section>;
}

function PreferenceMemory({ turn }: { turn: ScenarioTurn }) {
  const rejectedItems: string[] = [];
  return <Card className="border-blue-200"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-blue-600" /> RA-Rec Preference Memory</CardTitle></CardHeader><CardContent className="space-y-3"><JsonViewer data={turn.dialogueState} updatedPaths={turn.updatedFields} /><div className="grid gap-2 text-xs"><div className="rounded-xl bg-blue-50 p-3"><strong>Accepted Items:</strong> {turn.dialogueState.accepted_items?.join(", ") || "없음"}</div><div className="rounded-xl bg-blue-50 p-3"><strong>Rejected Items:</strong> {rejectedItems.join(", ") || "없음"}</div><div className="rounded-xl bg-blue-50 p-3"><strong>Preference History:</strong> {turn.updatedFields.join(" → ") || "변경 없음"}</div></div></CardContent></Card>;
}

function WorkingMemory({ agent, turn, candidates }: { agent: AgentSnapshot; turn: ScenarioTurn; candidates: Product[] }) {
  return <Card className="border-emerald-200"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-emerald-700" /> SPN Working Memory</CardTitle></CardHeader><CardContent className="space-y-2 text-xs"><div className="rounded-xl bg-emerald-50 p-3"><strong>Planning Context:</strong> {agent.vagueness > 50 ? "불확실성 해소를 위한 질문 우선" : "도구 결과를 통합해 최종 응답 구성"}</div><div className="rounded-xl bg-emerald-50 p-3"><strong>Browser Cache:</strong> {agent.shouldBrowse ? `후보 ${candidates.length}개, 리뷰 ${turn.retrievedReviews.length}개` : "탐색 전"}</div><div className="rounded-xl bg-emerald-50 p-3"><strong>Current Page:</strong> {agent.shouldBrowse ? candidates[0]?.title || "상품 검색 결과" : "없음"}</div><div className="rounded-xl bg-emerald-50 p-3"><strong>Search Results:</strong> {candidates.map((product) => product.brand).join(", ") || "없음"}</div><div className="rounded-xl bg-emerald-50 p-3"><strong>Review Images:</strong> {agent.shouldBrowse ? "상품 이미지 및 사용 장면 요약 수집" : "수집 대기"}</div><div className="rounded-xl bg-emerald-50 p-3"><strong>Tool Outputs:</strong> {agent.browseSummary}</div></CardContent></Card>;
}

function RecommendationCard({ product, index, turn }: { product: Product; index: number; turn: ScenarioTurn }) {
  const score = product.id === "android-tablet-10" ? 94 : product.id === "alldocube-iplay-50" ? 87 : 82 - index * 2;
  const reviews = product.reviews.slice(0, 2);
  return <Card className="overflow-hidden border-slate-200 bg-white"><div className="relative h-28"><Image src={product.image} alt={product.title} fill sizes="(max-width: 768px) 100vw, 380px" className="object-cover" /><Badge className="absolute left-3 top-3 bg-white text-blue-700">엔진 점수 {score}%</Badge></div><CardContent className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold leading-5">{product.title}</h3><p className="mt-1 text-xs text-slate-500">{product.brand} · {formatPrice(product.price)}</p></div><div className="flex items-center gap-1 text-xs font-bold text-amber-700"><Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />{product.rating}</div></div><ul className="space-y-1.5 text-xs leading-5 text-slate-600">{reviews.map((review) => <li key={review} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{review}</li>)}</ul>{turn.dialogueState.accepted_items?.includes(product.title) && <Badge variant="success">사용자 관심 상품</Badge>}</CardContent></Card>;
}

export default function Home() {
  const [visibleTurn, setVisibleTurn] = useState(0);
  const [selectedTurn, setSelectedTurn] = useState(0);
  const [processingStage, setProcessingStage] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(true);
  const [inputValue, setInputValue] = useState("");

  const currentTurn = scenario.turns[selectedTurn];
  const agent = agentSnapshots[selectedTurn] ?? agentSnapshots[0];
  const visibleTurns = scenario.turns.slice(0, visibleTurn + 1);
  const candidates = useMemo(() => currentTurn.candidateProductIds.map((id) => products.find((product) => product.id === id)).filter(Boolean) as Product[], [currentTurn]);
  const spnAction = agent.vagueness > 50 ? "Ask User" : candidates.length ? "Call Recommendation Engine" : "Browse Products";
  const orchestratorSteps = useMemo<OrchestratorStep[]>(() => [
    { title: "Task Planning", icon: Compass, action: spnAction, detail: "SPN이 쇼핑 목표와 현재 세션의 다음 작업을 결정합니다." },
    { title: "Vagueness Estimation", icon: CircleHelp, action: `${agent.vagueness}%`, detail: agent.missingInformation.length ? `필요 정보: ${agent.missingInformation.join(", ")}` : "추천과 탐색에 충분한 맥락이 확보되었습니다." },
    { title: "Tool Use", icon: Globe2, action: agent.shouldBrowse ? "Browse Products · Fetch Images · Read Reviews" : "Ask User", detail: agent.shouldBrowse ? agent.browseSummary : "모호성이 높아 브라우징보다 추가 질문을 우선합니다." },
    { title: "Call Recommendation Engine", icon: Zap, action: "RA-Rec API Request", detail: "SPN 작업 메모리와 사용자 선호를 RecommendationRequest로 전달합니다." },
    { title: "Integrate Final Response", icon: Sparkles, action: "SPN Final Response", detail: "엔진 추천에 이미지, 도구 결과, 다음 상호작용을 결합합니다." }
  ], [agent, spnAction]);
  const requestContract = useMemo(() => ({ task: candidates.length ? "recommend" : "ask_for_information", dialogue_state: currentTurn.dialogueState, spn_preferences: agent.spn, browser_evidence: { products: candidates.map((product) => product.title), reviews: currentTurn.retrievedReviews, images: agent.shouldBrowse ? ["product-page-image", "review-image-summary"] : [] } }), [agent, candidates, currentTurn]);
  const responseContract = useMemo(() => ({ updated_dialogue_state: currentTurn.dialogueState, ranked_products: candidates.map((product) => product.title), review_evidence: currentTurn.retrievedReviews, explanation: currentTurn.assistant, follow_up_question: agent.vagueness > 50 ? agent.missingInformation[0] || "사용 목적을 알려주세요." : null }), [agent, candidates, currentTurn]);

  useEffect(() => {
    setProcessingStage(0);
    const timers = orchestratorSteps.map((_, index) => window.setTimeout(() => setProcessingStage(index), index * 420));
    return () => timers.forEach(window.clearTimeout);
  }, [selectedTurn, orchestratorSteps]);

  function advanceConversation() {
    if (visibleTurn >= scenario.turns.length - 1 || isTyping) return;
    setIsTyping(true);
    window.setTimeout(() => { const nextTurn = visibleTurn + 1; setVisibleTurn(nextTurn); setSelectedTurn(nextTurn); setInputValue(""); setIsTyping(false); }, 720);
  }

  function jumpToFinalTurn() { setVisibleTurn(scenario.turns.length - 1); setSelectedTurn(scenario.turns.length - 1); }

  return <main className="mx-auto min-h-screen w-full max-w-[1780px] p-4 text-slate-900 md:p-6"><header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/75 px-5 py-4 shadow-panel backdrop-blur"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Hierarchical shopping architecture</p><h1 className="mt-1 text-xl font-bold md:text-2xl">SPN Orchestrator / RA-Rec Engine</h1><p className="mt-1 text-sm text-slate-500">SPN이 쇼핑 작업과 도구를 조율하고, 필요한 시점에 RA-Rec 추천 서비스를 호출합니다.</p></div><div className="flex flex-wrap items-center justify-end gap-2"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">SPN: Task-level Orchestrator</Badge><Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">RA-Rec: Recommendation Service</Badge><div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2"><span className="text-sm font-semibold text-slate-600">아키텍처 보기</span><Switch checked={showArchitecture} onCheckedChange={setShowArchitecture} aria-label="아키텍처 보기" /></div></div></header><div className={cn("grid gap-4", showArchitecture ? "xl:grid-cols-[minmax(340px,0.85fr)_minmax(480px,1.2fr)_minmax(390px,0.95fr)]" : "mx-auto max-w-4xl xl:grid-cols-1")}><section className="grid min-h-[760px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-panel"><header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><p className="text-xs font-bold text-slate-400">User conversation</p><h2 className="text-lg font-bold">처음 사보는 태블릿</h2></div><Button variant="outline" size="sm" onClick={jumpToFinalTurn}>최종 흐름 보기</Button></header><div className="space-y-5 overflow-auto p-5 scrollbar-thin">{visibleTurns.map((turn, index) => <button key={`${turn.user}-${index}`} type="button" onClick={() => setSelectedTurn(index)} className={cn("block w-full rounded-2xl border border-transparent p-2 text-left transition-all", selectedTurn === index && "border-emerald-200 bg-emerald-50/60")}><div className="space-y-4"><MessageBubble role="user">{turn.user}</MessageBubble><MessageBubble role="assistant">{turn.assistant}</MessageBubble></div></button>)}{isTyping && <TypingBubble />}</div><footer className="border-t border-slate-100 p-4"><div className="mb-3 flex flex-wrap gap-2">{scenario.suggestions.map((suggestion) => <Button key={suggestion} type="button" variant="outline" size="sm" onClick={advanceConversation}>{suggestion}</Button>)}</div><div className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"><input value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") advanceConversation(); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder={visibleTurn >= scenario.turns.length - 1 ? "흐름 완료" : "직접 입력하거나 추천 응답을 눌러보세요..."} /><Button type="button" size="icon" onClick={advanceConversation} disabled={visibleTurn >= scenario.turns.length - 1 || isTyping}>{isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div><p className="mt-2 text-center text-xs text-slate-400">설명용 mock 데이터입니다. 실제 웹 브라우저 또는 추천 API를 호출하지 않습니다.</p></footer></section>{showArchitecture && <section className="min-h-[760px] overflow-hidden rounded-3xl border border-emerald-200 bg-white/95 shadow-panel"><header className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-4"><p className="text-xs font-bold text-emerald-700">Task-level agent</p><h2 className="text-lg font-bold">SPN Shopping Agent</h2><p className="mt-1 text-sm text-emerald-900">Planner가 질문·도구 호출·추천 엔진 호출·최종 통합을 소유합니다.</p></header><div className="max-h-[calc(100vh-170px)] space-y-3 overflow-auto p-5 scrollbar-thin"><div className="grid gap-2 sm:grid-cols-2"><Card className="border-emerald-200 bg-emerald-50"><CardContent className="p-3"><p className="text-xs font-bold text-emerald-700">SPN Planner Action</p><p className="mt-1 text-sm font-bold">{spnAction}</p><p className="mt-1 text-xs text-slate-600">Ask User · Browse Products · Fetch Images · Read Reviews · Call Engine · Integrate</p></CardContent></Card><Card className="border-blue-200 bg-blue-50"><CardContent className="p-3"><p className="text-xs font-bold text-blue-700">RA-Rec Engine Action</p><p className="mt-1 text-sm font-bold">{currentTurn.candidateProductIds.length ? "Recommendation · Explanation" : "Recommendation Follow-up"}</p><p className="mt-1 text-xs text-slate-600">DST · Preference Memory · Retrieval · Recommendation · QA</p></CardContent></Card></div>{orchestratorSteps.slice(0, 3).map((step, index) => <div key={step.title}><TimelineNode step={step} active={processingStage === index} done={processingStage > index} /> <ArrowDown className="mx-auto my-1 h-4 w-4 text-emerald-300" /></div>)}<div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-3"><div className="mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-emerald-700" /><div><p className="text-xs font-bold text-emerald-700">Service invocation</p><h3 className="text-sm font-bold">SPN → RA-Rec 호출</h3></div><Badge className="ml-auto" variant={processingStage === 3 ? "success" : processingStage > 3 ? "outline" : "secondary"}>{processingStage === 3 ? "호출 중" : processingStage > 3 ? "응답 수신" : "대기"}</Badge></div><CodeBlock label="RecommendationRequest" data={requestContract} tone="emerald" /><div className="flex justify-center"><ArrowDown className="my-2 h-5 w-5 text-emerald-400" /></div><RARecEngine turn={currentTurn} active={processingStage === 3} done={processingStage > 3} /><div className="flex justify-center"><ArrowDown className="my-2 h-5 w-5 text-blue-400" /></div><CodeBlock label="RecommendationResponse" data={responseContract} tone="blue" /></div><ArrowDown className="mx-auto my-1 h-4 w-4 text-emerald-300" /><TimelineNode step={orchestratorSteps[4]} active={processingStage === 4} done={false} /><Card className="border-emerald-300 bg-emerald-50"><CardContent className="flex gap-3 p-4"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><p className="text-sm font-bold">SPN Final Response</p><p className="mt-1 text-sm leading-6 text-slate-700">{currentTurn.assistant}</p></div></CardContent></Card></div></section>}{showArchitecture && <aside className="min-h-[760px] overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-panel"><header className="border-b border-slate-100 px-5 py-4"><p className="text-xs font-bold text-slate-400">Separated memory and results</p><h2 className="text-lg font-bold">작업 메모리 / 선호 메모리</h2></header><div className="max-h-[calc(100vh-170px)] space-y-4 overflow-auto p-5 scrollbar-thin"><WorkingMemory agent={agent} turn={currentTurn} candidates={candidates} /><PreferenceMemory turn={currentTurn} /><Card className="border-slate-200"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Search className="h-4 w-4 text-blue-600" /> RA-Rec Review Evidence</CardTitle></CardHeader><CardContent>{currentTurn.retrievedReviews.length ? <ul className="space-y-2 text-sm text-slate-700">{currentTurn.retrievedReviews.map((review, index) => <li key={review} className="flex gap-2 rounded-xl bg-slate-50 p-3"><Badge variant="success" className="h-5 shrink-0 px-1.5">{index + 1}</Badge><span>{review}</span></li>)}</ul> : <p className="text-sm leading-6 text-slate-500">SPN이 추가 정보를 수집한 뒤 RA-Rec에 리뷰 검색을 요청합니다.</p>}</CardContent></Card>{candidates.length ? candidates.map((product, index) => <RecommendationCard key={product.id} product={product} index={index} turn={currentTurn} />) : <Card className="border-slate-200"><CardContent className="p-6 text-center text-sm leading-6 text-slate-500">SPN Planner가 모호성을 해소하는 중입니다. 이후 RecommendationRequest가 생성됩니다.</CardContent></Card>}</div></aside>}</div></main>;
}
