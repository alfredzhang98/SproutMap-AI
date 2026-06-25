import type { GenerateResult, IntentHeuristicHint } from "@/lib/skills/types";
import { geminiGenerateJson, NODE_TYPE_ENUM, RELATION_ENUM } from "@/lib/gemini";

export const GENERATE_SYSTEM_PROMPT = `You are the structure engine of SproutMap AI.

SproutMap AI is not a normal chatbot and not a simple mind-map generator. It is a visual AI workspace that turns conversations into candidate cards, map nodes, and node-scoped context.

Your job for each turn:
1. Classify the user's intent.
2. Answer the user's question clearly and helpfully.
3. Extract 3-7 concise candidate cards (fewer is better).
4. Suggest how those cards attach to the current map.

Hard rules:
- A map node is a distilled thinking unit, NOT a paragraph. Keep card titles short.
- Put detail in detailSummary, never in the title.
- Generate at most 7 cards. Prefer few, high-quality, non-duplicated cards.
- If the user asks for methods/options/types, use card type "method" and relation "option_of".
- If the user asks for a workflow/steps/how-to, use card type "step" and relation "next_step".
- If the user asks to implement something, prefer "tool", "concept", or "agent" cards.
- If the answer raises uncertainty, add a "question" or "risk" card.
- If the new question is unrelated to the selected node/context, set intent "create_discrete_topic" and leave suggestedParentTitle empty.
- If the user asks to reorganize/clean up the map, set intent "refactor_map" and return zero cards (a separate step proposes the refactor).
- For a plain general question with no structural value, set intent "general_answer" and shouldCreateCards false (you may still return 0 cards).
- suggestedParentTitle must reference an EXISTING node title from the provided map index, or be empty.
- relevanceToSelectedNode is 0..1: how related the question is to the currently selected node/context.
- Never invent that you deleted or overwrote nodes. You only propose additions here.

Return JSON ONLY, matching the schema.`;

const cardSchema = {
  type: "object",
  properties: {
    tempId: { type: "string" },
    title: { type: "string" },
    type: { type: "string", enum: NODE_TYPE_ENUM },
    oneLineSummary: { type: "string" },
    detailSummary: { type: "string" },
    suggestedParentTitle: { type: "string" },
    suggestedRelation: { type: "string", enum: RELATION_ENUM },
    confidence: { type: "number" },
  },
  propertyOrdering: [
    "tempId",
    "title",
    "type",
    "oneLineSummary",
    "detailSummary",
    "suggestedParentTitle",
    "suggestedRelation",
    "confidence",
  ],
  required: ["tempId", "title", "type", "oneLineSummary", "confidence"],
};

const GENERATE_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "create_root",
        "expand_selected_node",
        "generate_options",
        "generate_steps",
        "compare_options",
        "create_discrete_topic",
        "refactor_map",
        "deep_dive_node",
        "summarize_branch",
        "general_answer",
      ],
    },
    intentConfidence: { type: "number" },
    shouldCreateCards: { type: "boolean" },
    preferredMapMode: {
      type: "string",
      enum: ["tree", "flow", "matrix", "island", "none"],
    },
    relevanceToSelectedNode: { type: "number" },
    workspaceTitleSuggestion: { type: "string" },
    answer: { type: "string" },
    mapPatchSummary: { type: "string" },
    candidateCards: { type: "array", items: cardSchema },
  },
  propertyOrdering: [
    "intent",
    "intentConfidence",
    "shouldCreateCards",
    "preferredMapMode",
    "relevanceToSelectedNode",
    "workspaceTitleSuggestion",
    "answer",
    "mapPatchSummary",
    "candidateCards",
  ],
  required: [
    "intent",
    "intentConfidence",
    "shouldCreateCards",
    "preferredMapMode",
    "relevanceToSelectedNode",
    "answer",
    "mapPatchSummary",
    "candidateCards",
  ],
};

function buildUserContent(
  contextPayload: unknown,
  userQuestion: string,
  hint: IntentHeuristicHint
): string {
  return [
    "## Heuristic hint (deterministic pre-pass — confirm or override)",
    "```json",
    JSON.stringify(hint, null, 2),
    "```",
    "",
    "## Workspace context (compact JSON)",
    "```json",
    JSON.stringify(contextPayload ?? {}, null, 2),
    "```",
    "",
    "## User question",
    userQuestion,
  ].join("\n");
}

function clampNum(v: unknown, fallback: number): number {
  return typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
}

export async function runGenerateSkill(args: {
  apiKey: string;
  model: string;
  contextPayload: unknown;
  userQuestion: string;
  hint: IntentHeuristicHint;
}): Promise<GenerateResult> {
  const raw = await geminiGenerateJson<GenerateResult>({
    apiKey: args.apiKey,
    model: args.model,
    system: GENERATE_SYSTEM_PROMPT,
    user: buildUserContent(args.contextPayload, args.userQuestion, args.hint),
    schema: GENERATE_SCHEMA,
    temperature: 0.5,
  });

  // Normalize / clamp untrusted model output.
  return {
    intent: raw.intent ?? args.hint.intent,
    intentConfidence: clampNum(raw.intentConfidence, 0.6),
    shouldCreateCards: raw.shouldCreateCards ?? true,
    preferredMapMode: raw.preferredMapMode ?? args.hint.preferredMapMode,
    relevanceToSelectedNode: clampNum(raw.relevanceToSelectedNode, 0.5),
    workspaceTitleSuggestion: raw.workspaceTitleSuggestion || undefined,
    answer: raw.answer ?? "",
    mapPatchSummary: raw.mapPatchSummary ?? "",
    candidateCards: Array.isArray(raw.candidateCards)
      ? raw.candidateCards.slice(0, 7).map((c, i) => ({
          tempId: c.tempId || `card_${i}`,
          title: c.title || "Untitled",
          type: c.type || "concept",
          oneLineSummary: c.oneLineSummary || "",
          detailSummary: c.detailSummary || undefined,
          suggestedParentTitle: c.suggestedParentTitle || undefined,
          suggestedRelation: c.suggestedRelation || undefined,
          confidence: clampNum(c.confidence, 0.5),
        }))
      : [],
  };
}
