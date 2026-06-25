import type { NodeMemoryResult } from "@/types/agent";
import { geminiGenerateJson } from "@/lib/gemini";

export const MEMORY_SYSTEM_PROMPT = `You maintain the memory summary for a node in SproutMap AI.

Given a node, its children, recent related messages, and prior memory, produce an updated, compressed memory.

Rules:
- Preserve user decisions and important details.
- Compress repeated content.
- shortSummary must be under 25 words.
- detailSummary should be concise but informative.
- decisionLog: key decisions made about this node (may be empty).
- openQuestions: unresolved questions worth exploring (may be empty).

Return JSON ONLY.`;

const MEMORY_SCHEMA = {
  type: "object",
  properties: {
    shortSummary: { type: "string" },
    detailSummary: { type: "string" },
    decisionLog: { type: "array", items: { type: "string" } },
    openQuestions: { type: "array", items: { type: "string" } },
  },
  propertyOrdering: ["shortSummary", "detailSummary", "decisionLog", "openQuestions"],
  required: ["shortSummary", "detailSummary", "decisionLog", "openQuestions"],
};

export async function runMemorySkill(args: {
  apiKey: string;
  model: string;
  payload: unknown;
}): Promise<NodeMemoryResult> {
  const user = ["## Node + context", "```json", JSON.stringify(args.payload ?? {}, null, 2), "```"].join(
    "\n"
  );
  const raw = await geminiGenerateJson<Partial<NodeMemoryResult>>({
    apiKey: args.apiKey,
    model: args.model,
    system: MEMORY_SYSTEM_PROMPT,
    user,
    schema: MEMORY_SCHEMA,
    temperature: 0.3,
  });
  return {
    shortSummary: raw.shortSummary ?? "",
    detailSummary: raw.detailSummary ?? "",
    decisionLog: Array.isArray(raw.decisionLog) ? raw.decisionLog : [],
    openQuestions: Array.isArray(raw.openQuestions) ? raw.openQuestions : [],
  };
}
