import type { ComparisonResult } from "@/types/agent";
import { geminiGenerateJson } from "@/lib/gemini";

export const COMPARE_SYSTEM_PROMPT = `You build a comparison / decision matrix for SproutMap AI.

Given a question about comparing options, produce:
- A short title for the comparison.
- 2-5 options.
- 3-6 evaluation criteria.
- A cell for every (option, criterion) pair with a short rating (e.g. "High", "Low", "$$", "8/10", or a few words) and an optional one-line note.
- A clear recommendation with brief reasoning.

Keep ratings terse so they fit a table. Return JSON ONLY.`;

const COMPARE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    options: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, summary: { type: "string" } },
        propertyOrdering: ["name", "summary"],
        required: ["name", "summary"],
      },
    },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" } },
        propertyOrdering: ["name"],
        required: ["name"],
      },
    },
    cells: {
      type: "array",
      items: {
        type: "object",
        properties: {
          option: { type: "string" },
          criterion: { type: "string" },
          rating: { type: "string" },
          note: { type: "string" },
        },
        propertyOrdering: ["option", "criterion", "rating", "note"],
        required: ["option", "criterion", "rating"],
      },
    },
    recommendation: { type: "string" },
  },
  propertyOrdering: ["title", "options", "criteria", "cells", "recommendation"],
  required: ["title", "options", "criteria", "cells", "recommendation"],
};

export async function runComparisonSkill(args: {
  apiKey: string;
  model: string;
  question: string;
}): Promise<ComparisonResult> {
  const user = ["## Comparison request", args.question].join("\n");
  const raw = await geminiGenerateJson<Partial<ComparisonResult>>({
    apiKey: args.apiKey,
    model: args.model,
    system: COMPARE_SYSTEM_PROMPT,
    user,
    schema: COMPARE_SCHEMA,
    temperature: 0.4,
  });

  return {
    title: raw.title || "Comparison",
    options: Array.isArray(raw.options)
      ? raw.options.slice(0, 5).map((o) => ({ name: o.name || "Option", summary: o.summary || "" }))
      : [],
    criteria: Array.isArray(raw.criteria)
      ? raw.criteria.slice(0, 6).map((c) => ({ name: c.name || "Criterion" }))
      : [],
    cells: Array.isArray(raw.cells)
      ? raw.cells.map((c) => ({
          option: c.option || "",
          criterion: c.criterion || "",
          rating: c.rating || "—",
          note: c.note || undefined,
        }))
      : [],
    recommendation: raw.recommendation || "",
  };
}
