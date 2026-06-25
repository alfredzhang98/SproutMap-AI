export type NodeType =
  | "root"
  | "topic"
  | "concept"
  | "method"
  | "step"
  | "question"
  | "decision"
  | "evidence"
  | "risk"
  | "example"
  | "tool"
  | "agent"
  | "workflow"
  | "metric";

export type EdgeRelation =
  | "contains"
  | "part_of"
  | "next_step"
  | "option_of"
  | "supports"
  | "contradicts"
  | "relates_to"
  | "derived_from"
  | "unresolved_question";

export type MapNodeData = {
  id: string;
  title: string;
  type: NodeType;
  oneLineSummary: string;
  detailSummary?: string;
  userNotes?: string;
  sourceMessageIds: string[];
  parentId?: string;
  topicIslandId: string;
  orderIndex?: number;
  tags: string[];
  createdBy: "user" | "ai";
  updatedAt: string;
  isLocked?: boolean;
  // Node memory (incrementally maintained by the Memory skill).
  decisionLog?: string[];
  openQuestions?: string[];
  // Marks nodes produced by a full-auto draft generation.
  isDraft?: boolean;
};

export type MapEdgeData = {
  id: string;
  source: string;
  target: string;
  relation: EdgeRelation;
  label?: string;
  confidence?: number;
  createdBy: "user" | "ai";
  isSuggested?: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  selectedNodeId?: string;
  generatedCardIds?: string[];
};

export type CandidateCard = {
  id: string;
  title: string;
  type: NodeType;
  oneLineSummary: string;
  detailSummary?: string;
  suggestedParentId?: string;
  suggestedParentTitle?: string;
  suggestedRelation?: EdgeRelation;
  confidence: number;
  sourceMessageId: string;
  status: "pending" | "accepted" | "discarded" | "deferred";
};

export const NODE_TYPES: NodeType[] = [
  "root",
  "topic",
  "concept",
  "method",
  "step",
  "question",
  "decision",
  "evidence",
  "risk",
  "example",
  "tool",
  "agent",
  "workflow",
  "metric",
];

/** Node types the LLM may produce for a card (root is reserved for the system). */
export const CARD_NODE_TYPES: NodeType[] = NODE_TYPES.filter((t) => t !== "root");

export const EDGE_RELATIONS: EdgeRelation[] = [
  "contains",
  "part_of",
  "next_step",
  "option_of",
  "supports",
  "contradicts",
  "relates_to",
  "derived_from",
  "unresolved_question",
];

export const NODE_TYPE_META: Record<
  NodeType,
  { label: string; icon: string; color: string }
> = {
  root: { label: "Root", icon: "◉", color: "#40916c" },
  topic: { label: "Topic", icon: "▣", color: "#52a37b" },
  concept: { label: "Concept", icon: "✦", color: "#5a8fb0" },
  method: { label: "Method", icon: "⚙", color: "#8a76c9" },
  step: { label: "Step", icon: "→", color: "#c98a3e" },
  question: { label: "Question", icon: "?", color: "#c75c8a" },
  decision: { label: "Decision", icon: "✓", color: "#3e9ec9" },
  evidence: { label: "Evidence", icon: "❝", color: "#5fa86a" },
  risk: { label: "Risk", icon: "!", color: "#d9534f" },
  example: { label: "Example", icon: "❖", color: "#7a9e3a" },
  tool: { label: "Tool", icon: "⚒", color: "#6b8e9e" },
  agent: { label: "Agent", icon: "◆", color: "#9a6fb0" },
  workflow: { label: "Workflow", icon: "⇄", color: "#c08a3e" },
  metric: { label: "Metric", icon: "∿", color: "#3e9ec9" },
};
