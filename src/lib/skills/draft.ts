import type { DraftMapResult } from "@/types/agent";
import { geminiGenerateJson } from "@/lib/gemini";

// Layering caps (PRD §17.9): ≤5 main branches, ≤5 children each.
const MAX_BRANCHES = 5;
const MAX_CHILDREN = 5;

export const DRAFT_SYSTEM_PROMPT = `You convert a long piece of text into a layered draft mind map for SproutMap AI.

Rules:
- Produce a single root title that captures the whole text.
- Produce at most 5 top-level branches (the main themes).
- Each branch has at most 5 children (key points).
- Titles must be short (a few words). Summaries are one concise sentence.
- Do not invent content beyond the text. Compress, do not pad.
- This is a DRAFT the user will refine, so favor clear structure over completeness.

Return JSON ONLY.`;

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    branches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          children: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
              },
              propertyOrdering: ["title", "summary"],
              required: ["title", "summary"],
            },
          },
        },
        propertyOrdering: ["title", "summary", "children"],
        required: ["title", "summary", "children"],
      },
    },
  },
  propertyOrdering: ["title", "summary", "branches"],
  required: ["title", "summary", "branches"],
};

export async function runDraftSkill(args: {
  apiKey: string;
  model: string;
  text: string;
}): Promise<DraftMapResult> {
  const user = ["## Source text", args.text].join("\n");
  const raw = await geminiGenerateJson<Partial<DraftMapResult>>({
    apiKey: args.apiKey,
    model: args.model,
    system: DRAFT_SYSTEM_PROMPT,
    user,
    schema: DRAFT_SCHEMA,
    temperature: 0.4,
  });

  return {
    title: raw.title || "Draft map",
    summary: raw.summary || "",
    branches: Array.isArray(raw.branches)
      ? raw.branches.slice(0, MAX_BRANCHES).map((b) => ({
          title: b.title || "Branch",
          summary: b.summary || "",
          children: Array.isArray(b.children)
            ? b.children.slice(0, MAX_CHILDREN).map((c) => ({
                title: c.title || "Point",
                summary: c.summary || "",
              }))
            : [],
        }))
      : [],
  };
}
