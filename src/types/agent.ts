import type { EdgeRelation, NodeType } from "./map";

// ── Intent ────────────────────────────────────────────────────────────────

export type UserIntent =
  | "create_root"
  | "expand_selected_node"
  | "generate_options"
  | "generate_steps"
  | "compare_options"
  | "create_discrete_topic"
  | "refactor_map"
  | "deep_dive_node"
  | "summarize_branch"
  | "general_answer";

export type PreferredMapMode = "tree" | "flow" | "matrix" | "island" | "none";

export type IntentResult = {
  intent: UserIntent;
  confidence: number;
  shouldCreateCards: boolean;
  preferredMapMode: PreferredMapMode;
  reason: string;
  /** Heuristic: did the user explicitly ask to build/generate/reorganize a map? */
  explicitMapCommand: boolean;
};

// ── Automation ──────────────────────────────────────────────────────────────

export type AutomationLevel =
  | "none"
  | "candidate_only"
  | "ghost_preview"
  | "auto_add_scoped"
  | "patch_preview"
  | "full_auto_draft";

export type AutomationMode = "manual" | "balanced" | "auto_assist";

export type AutomationDecisionInput = {
  intent: UserIntent;
  userExplicitCommand: boolean;
  selectedNodeId?: string;
  relationConfidence: number;
  relevanceToSelectedNode: number;
  proposedNodeCount: number;
  proposedMaxDepth: number;
  modifiesExistingStructure: boolean;
  createsCrossTopicEdges: boolean;
  createsNewTopicIsland: boolean;
  graphComplexityScore: number;
  userAutomationPreference: AutomationMode;
};

export type AutomationDecision = {
  level: AutomationLevel;
  reason: string;
  requiresUserConfirmation: boolean;
  allowUndo: boolean;
};

// ── Map Patch ────────────────────────────────────────────────────────────────

export type MapPatchOpType =
  | "create_node"
  | "create_edge"
  | "create_topic_island"
  | "insert_between"
  | "rename_node"
  | "update_node_summary"
  | "change_edge_relation"
  | "move_node"
  | "merge_nodes"
  | "collapse_subtree";

/**
 * A single map operation. `payload` is op-specific; refs may point at an
 * existing node id OR a tempId defined earlier within the same patch.
 */
export type MapPatchOperation = {
  id: string;
  type: MapPatchOpType;
  payload: Record<string, unknown>;
  confidence?: number;
  explanation?: string;
  /** UI selection state inside the patch preview. */
  selected?: boolean;
};

export type MapPatch = {
  id: string;
  summary: string;
  intent: UserIntent;
  automationLevel: AutomationLevel;
  operations: MapPatchOperation[];
  createdBy: "ai" | "user";
  status: "pending" | "accepted" | "rejected" | "partially_accepted";
  createdAt: string;
};

// ── Generate skill result (the main LLM agent output) ───────────────────────

export type GeneratedCard = {
  tempId: string;
  title: string;
  type: NodeType;
  oneLineSummary: string;
  detailSummary?: string;
  suggestedParentTitle?: string;
  suggestedRelation?: EdgeRelation;
  confidence: number;
};

export type GenerateResult = {
  intent: UserIntent;
  intentConfidence: number;
  shouldCreateCards: boolean;
  preferredMapMode: PreferredMapMode;
  relevanceToSelectedNode: number;
  workspaceTitleSuggestion?: string;
  answer: string;
  mapPatchSummary: string;
  candidateCards: GeneratedCard[];
};

export type NodeMemoryResult = {
  shortSummary: string;
  detailSummary: string;
  decisionLog: string[];
  openQuestions: string[];
};

// ── Refactor skill result ────────────────────────────────────────────────────

export type RefactorResult = {
  summary: string;
  operations: Array<{
    type: MapPatchOpType;
    payload: Record<string, unknown>;
    confidence?: number;
    explanation?: string;
  }>;
};
