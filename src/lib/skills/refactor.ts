import type { RefactorResult } from "@/types/agent";
import { geminiGenerateJson, RELATION_ENUM } from "@/lib/gemini";

export const REFACTOR_SYSTEM_PROMPT = `You are the Refactor agent for SproutMap AI.

Analyze the current map and propose a cleanup patch. Look for:
- Duplicate nodes (same idea, different titles).
- Overly broad nodes that should be split.
- Nodes under the wrong parent.
- Missing intermediate group nodes.
- Unclear or wrong edge relations.
- Orphan nodes that should attach somewhere or become their own island.
- Branches that should become a separate topic island.
- Flow nodes incorrectly represented as hierarchy (use next_step).
- Option nodes that should be siblings (use option_of).

Return a patch of operations ONLY. Do NOT delete anything. Every operation must be reversible and user-confirmable. Prefer merge/rename/move/change_edge_relation over creating new nodes. Reference nodes by their EXACT existing id from the provided graph. Keep it focused: at most ~8 operations.

Allowed operation types: rename_node, update_node_summary, change_edge_relation, move_node, merge_nodes, create_node, create_edge, create_topic_island.

Return JSON ONLY.`;

const REFACTOR_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    operations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "rename_node",
              "update_node_summary",
              "change_edge_relation",
              "move_node",
              "merge_nodes",
              "create_node",
              "create_edge",
              "create_topic_island",
            ],
          },
          explanation: { type: "string" },
          confidence: { type: "number" },
          // Loosely-typed payload fields (Gemini needs concrete props).
          nodeId: { type: "string" },
          newTitle: { type: "string" },
          newParentId: { type: "string" },
          nodeIds: { type: "array", items: { type: "string" } },
          edgeId: { type: "string" },
          relation: { type: "string", enum: RELATION_ENUM },
          oneLineSummary: { type: "string" },
          detailSummary: { type: "string" },
          title: { type: "string" },
          type_: { type: "string" },
          parentRef: { type: "string" },
          sourceRef: { type: "string" },
          targetRef: { type: "string" },
        },
        propertyOrdering: [
          "type",
          "explanation",
          "confidence",
          "nodeId",
          "newTitle",
          "newParentId",
          "nodeIds",
          "edgeId",
          "relation",
          "oneLineSummary",
          "detailSummary",
          "title",
          "type_",
          "parentRef",
          "sourceRef",
          "targetRef",
        ],
        required: ["type", "explanation"],
      },
    },
  },
  propertyOrdering: ["summary", "operations"],
  required: ["summary", "operations"],
};

type RawOp = {
  type: string;
  explanation?: string;
  confidence?: number;
  [k: string]: unknown;
};

/** Flatten the flat schema fields into a per-op `payload`. */
function toPayload(op: RawOp): Record<string, unknown> {
  const {
    type,
    explanation,
    confidence,
    type_,
    ...rest
  } = op;
  void type;
  void explanation;
  void confidence;
  const payload: Record<string, unknown> = { ...rest };
  if (type_) payload.type = type_; // node type for create_node
  // Drop empty strings.
  for (const k of Object.keys(payload)) {
    if (payload[k] === "" || payload[k] === undefined) delete payload[k];
  }
  return payload;
}

export async function runRefactorSkill(args: {
  apiKey: string;
  model: string;
  graphPayload: unknown;
  userInstruction: string;
}): Promise<RefactorResult> {
  const user = [
    "## Current map (nodes + edges)",
    "```json",
    JSON.stringify(args.graphPayload ?? {}, null, 2),
    "```",
    "",
    "## User instruction",
    args.userInstruction,
  ].join("\n");

  const raw = await geminiGenerateJson<{ summary?: string; operations?: RawOp[] }>({
    apiKey: args.apiKey,
    model: args.model,
    system: REFACTOR_SYSTEM_PROMPT,
    user,
    schema: REFACTOR_SCHEMA,
    temperature: 0.3,
  });

  return {
    summary: raw.summary ?? "Proposed cleanup",
    operations: Array.isArray(raw.operations)
      ? raw.operations.slice(0, 12).map((op) => ({
          type: op.type as RefactorResult["operations"][number]["type"],
          payload: toPayload(op),
          confidence: typeof op.confidence === "number" ? op.confidence : 0.6,
          explanation: op.explanation,
        }))
      : [],
  };
}
