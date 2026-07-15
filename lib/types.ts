export type SPNFacetName =
  | "subjective_property"
  | "event"
  | "activity"
  | "goal_purpose"
  | "goal_audience";

export type EvidenceOrigin = "explicit" | "implicit" | "inferred";
export type EvidenceStatus = "confirmed" | "unconfirmed" | "superseded";

export type PreferenceValue = {
  id: string;
  valueText: string;
  origin: EvidenceOrigin;
  confidence: number;
  status: EvidenceStatus;
  evidenceTurnIds: string[];
  updatedAtTurnId: string;
};

export type SPNState = Record<SPNFacetName, PreferenceValue | null>;

export type RejectedItem = { productId: string; reason: PreferenceValue };

export type DialogueState = {
  category?: PreferenceValue;
  hardConstraints: Record<string, PreferenceValue>;
  softConstraints: Record<string, PreferenceValue>;
  subjectiveNeeds: SPNState;
  tradeoffs: PreferenceValue[];
  recommendedItems: string[];
  shortlistedItems: string[];
  inspectedItems: string[];
  rejectedItems: RejectedItem[];
  cartedItems: string[];
  purchasedItems: string[];
  currentItem?: string;
  unresolvedPreferences: Array<{ field: string; reason: string; priority: number }>;
  preferenceHistory: Array<{ turnId: string; changedPaths: string[] }>;
};

export type Product = {
  id: string;
  title: string;
  image: string;
  brand: string;
  price: number;
  rating: number;
  reviewCount: number;
  description: string;
  shipping: string;
  stock: string;
  metadata: {
    category: string;
    display: string;
    ram: string;
    storage: string;
    battery: string;
    weight: string;
    useCases: string[];
    noteTaking: boolean;
  };
};

export type Review = {
  id: string;
  productId: string;
  text: string;
  helpfulness?: number;
  source: "mock";
};

export type RankedReview = Review & {
  similarityScore: number;
  preferenceCoverageScore: number;
  reliabilityScore: number;
  totalScore: number;
  matchedPreferenceIds: string[];
};

export type ScoreBreakdown = {
  hardConstraintMatch: number;
  metadataMatch: number;
  subjectiveNeedMatch: number;
  reviewEvidenceScore: number;
  evidenceReliability: number;
  total: number;
};

export type RankedProduct = {
  productId: string;
  rank: number;
  score: ScoreBreakdown;
  evidenceReviewIds: string[];
  matchedPreferenceIds: string[];
};

export type StateDiff = { changedPaths: string[]; summary: string[] };

export type VaguenessBreakdown = {
  categoryBreadth: number;
  missingRequiredInfo: number;
  unresolvedSPN: number;
  contradictionPenalty: number;
  total: number;
  threshold: number;
  reasons: string[];
};

export type SPNSnapshot = { facets: SPNState; vagueness: VaguenessBreakdown };

export type PolicyDecision = {
  action: "ask_user" | "recommend";
  questionTarget?: { field: string; reason: string; priority: number };
  reasons: string[];
};

export type BrowseResult = { products: Product[]; reviews: Review[]; images: string[]; priceEvidence: string[]; deliveryEvidence: string[] };

export type RecommendationResponse = {
  updatedDialogueState: DialogueState;
  rankedProducts: RankedProduct[];
  reviewEvidence: RankedReview[];
  explanation: string;
  unresolvedPreferences: DialogueState["unresolvedPreferences"];
};

export type FinalResponse = {
  message: string;
  productCards: RankedProduct[];
  priceEvidence: string[];
  deliveryEvidence: string[];
  imageEvidence: string[];
  reviewEvidence: RankedReview[];
  nextActions: string[];
};

export type ConversationTurn = {
  id: string;
  user: string;
  assistant: string;
  state: DialogueState;
  diff: StateDiff;
  snapshot: SPNSnapshot;
  policy: PolicyDecision;
  query: string | null;
  browseResult: BrowseResult | null;
  recommendation: RecommendationResponse | null;
  finalResponse: FinalResponse;
  previousRankings: RankedProduct[];
};
