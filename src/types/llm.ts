import type { EdgeRelation, NodeType } from "./map";

export type LLMIntent =
  | "general_answer"
  | "create_root"
  | "expand_topic"
  | "create_flow"
  | "create_options"
  | "compare"
  | "create_discrete_topic"
  | "refine_existing_nodes";

export type CandidateCardDraft = {
  tempId: string;
  title: string;
  type: NodeType;
  oneLineSummary: string;
  detailSummary?: string;
  suggestedParentTitle?: string;
  suggestedRelation?: EdgeRelation;
  confidence: number;
};

export type SuggestedEdgeDraft = {
  sourceTempIdOrExistingId: string;
  targetTempIdOrExistingId: string;
  relation: EdgeRelation;
  label?: string;
  confidence: number;
};

export type LLMStructuredResponse = {
  answer: string;
  workspaceTitleSuggestion?: string;
  selectedAnchorId?: string;
  intent: LLMIntent;
  candidateCards: CandidateCardDraft[];
  suggestedEdges: SuggestedEdgeDraft[];
  mapPatchSummary: string;
};

// Latest Google Gemini 3 / 3.1 model IDs (no legacy 2.x). All support
// `generateContent` with JSON structured output (responseSchema). List what
// your key can access via GET https://generativelanguage.googleapis.com/v1beta/models.
export const ALLOWED_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
] as const;
export type AllowedModel = (typeof ALLOWED_MODELS)[number];

// Frontier-class Flash with strong structured extraction — good default.
export const DEFAULT_MODEL: AllowedModel = "gemini-3-flash-preview";

export type ChatMapRequest = {
  apiKey: string;
  model: AllowedModel;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  contextPayload: unknown;
  userQuestion: string;
};
