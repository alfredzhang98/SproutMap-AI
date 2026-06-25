import type {
  CandidateCard,
  EdgeRelation,
  MapEdgeData,
  MapNodeData,
} from "@/types/map";
import type {
  GenerateResult,
  MapPatch,
  MapPatchOperation,
  UserIntent,
} from "@/types/agent";
import { newId, nowIso } from "@/lib/ids";
import { findNodeIdByTitle, getChildren, getRootNode } from "./graph";

/** Default edge relation implied by an intent when a card omits one. */
function relationForIntent(intent: UserIntent): EdgeRelation {
  switch (intent) {
    case "generate_steps":
      return "next_step";
    case "generate_options":
    case "compare_options":
      return "option_of";
    case "deep_dive_node":
    case "expand_selected_node":
      return "part_of";
    default:
      return "contains";
  }
}

/**
 * Map Planner (deterministic). Turns candidate cards + intent into a proposed
 * MapPatch of `create_node` / `create_topic_island` operations, resolving each
 * card's parent to an existing node id where possible. No LLM call.
 */
export function planMapPatchFromCards(args: {
  cards: CandidateCard[];
  nodes: MapNodeData[];
  intent: UserIntent;
  automationLevel: MapPatch["automationLevel"];
  selectedNodeId?: string;
  summary: string;
}): MapPatch {
  const { cards, nodes, intent, automationLevel, selectedNodeId, summary } = args;
  const relation = relationForIntent(intent);
  const root = getRootNode(nodes);
  const isFlow = intent === "generate_steps";

  const operations: MapPatchOperation[] = [];
  let previousTempId: string | undefined;

  cards.forEach((card, i) => {
    const tempId = `t_${card.id}`;
    const isDiscrete = intent === "create_discrete_topic";

    // Resolve the parent reference for this card.
    let parentRef: string | undefined;
    if (!isDiscrete) {
      if (card.suggestedParentId) parentRef = card.suggestedParentId;
      else if (card.suggestedParentTitle)
        parentRef = findNodeIdByTitle(card.suggestedParentTitle, nodes);
      if (!parentRef && selectedNodeId) parentRef = selectedNodeId;
      if (!parentRef && root) parentRef = root.id;
    }

    const cardRelation = card.suggestedRelation ?? relation;

    if (isDiscrete && i === 0) {
      // First card seeds the new island; the rest hang under it.
      operations.push({
        id: newId("op"),
        type: "create_topic_island",
        confidence: card.confidence,
        explanation: `New topic island: ${card.title}`,
        payload: {
          tempId,
          title: card.title,
          type: card.type === "root" ? "topic" : card.type,
          oneLineSummary: card.oneLineSummary,
          detailSummary: card.detailSummary,
          sourceMessageId: card.sourceMessageId,
        },
      });
    } else {
      const resolvedParent = isDiscrete ? previousTempId : parentRef;
      // In a flow, chain each step after the previous one.
      const flowParent = isFlow && previousTempId ? previousTempId : resolvedParent;
      operations.push({
        id: newId("op"),
        type: "create_node",
        confidence: card.confidence,
        explanation: card.oneLineSummary,
        payload: {
          tempId,
          title: card.title,
          type: card.type,
          oneLineSummary: card.oneLineSummary,
          detailSummary: card.detailSummary,
          parentRef: flowParent,
          relation: isFlow ? "next_step" : cardRelation,
          orderIndex: i,
          sourceMessageId: card.sourceMessageId,
        },
      });
    }
    previousTempId = tempId;
  });

  return {
    id: newId("patch"),
    summary,
    intent,
    automationLevel,
    operations: operations.map((o) => ({ ...o, selected: true })),
    createdBy: "ai",
    status: "pending",
    createdAt: nowIso(),
  };
}

export type GraphState = {
  nodes: MapNodeData[];
  edges: MapEdgeData[];
};

function makeNode(partial: Partial<MapNodeData> & { title: string }): MapNodeData {
  return {
    id: partial.id ?? newId("node"),
    title: partial.title,
    type: partial.type ?? "concept",
    oneLineSummary: partial.oneLineSummary ?? "",
    detailSummary: partial.detailSummary,
    userNotes: partial.userNotes,
    sourceMessageIds: partial.sourceMessageIds ?? [],
    parentId: partial.parentId,
    topicIslandId: partial.topicIslandId ?? newId("island"),
    orderIndex: partial.orderIndex,
    tags: partial.tags ?? [],
    createdBy: partial.createdBy ?? "ai",
    updatedAt: nowIso(),
    isLocked: partial.isLocked,
    isDraft: partial.isDraft,
  };
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/**
 * Apply a MapPatch to a graph and return the new graph. Only the operations
 * flagged `selected !== false` are applied. Refs resolve against (a) tempIds
 * created earlier in this patch, (b) existing node ids, or (c) node titles.
 * Pure: callers snapshot the previous graph for undo.
 */
export function applyMapPatch(state: GraphState, patch: MapPatch): GraphState {
  const nodes = state.nodes.map((n) => ({ ...n }));
  const edges = state.edges.map((e) => ({ ...e }));
  const tempIdToNodeId = new Map<string, string>();

  const byId = (id: string) => nodes.find((n) => n.id === id);
  const resolveRef = (ref?: string): string | undefined => {
    if (!ref) return undefined;
    if (tempIdToNodeId.has(ref)) return tempIdToNodeId.get(ref);
    if (byId(ref)) return ref;
    return findNodeIdByTitle(ref, nodes);
  };
  const addEdge = (
    source: string,
    target: string,
    relation: EdgeRelation,
    label?: string
  ) => {
    edges.push({
      id: newId("edge"),
      source,
      target,
      relation,
      label,
      createdBy: "ai",
    });
  };

  for (const op of patch.operations) {
    if (op.selected === false) continue;
    const p = op.payload;

    switch (op.type) {
      case "create_node":
      case "insert_between": {
        const parentId = resolveRef(asString(p.parentRef ?? p.edgeSource));
        const parent = parentId ? byId(parentId) : undefined;
        const node = makeNode({
          title: asString(p.title) ?? "New node",
          type: (asString(p.type) as MapNodeData["type"]) ?? "concept",
          oneLineSummary: asString(p.oneLineSummary) ?? "",
          detailSummary: asString(p.detailSummary),
          parentId,
          topicIslandId: parent?.topicIslandId ?? newId("island"),
          orderIndex: typeof p.orderIndex === "number" ? p.orderIndex : undefined,
          sourceMessageIds: asString(p.sourceMessageId)
            ? [asString(p.sourceMessageId)!]
            : [],
          isDraft: patch.automationLevel === "full_auto_draft" ? true : undefined,
        });
        nodes.push(node);
        if (asString(p.tempId)) tempIdToNodeId.set(asString(p.tempId)!, node.id);
        const relation = (asString(p.relation) as EdgeRelation) ?? "contains";

        if (op.type === "insert_between") {
          const edgeId = asString(p.edgeId);
          const edge = edges.find((e) => e.id === edgeId);
          if (edge) {
            const origTarget = edge.target;
            edge.target = node.id;
            const tgt = byId(origTarget);
            if (tgt) tgt.parentId = node.id;
            addEdge(node.id, origTarget, edge.relation);
          }
        } else if (parentId) {
          addEdge(parentId, node.id, relation);
        }
        break;
      }

      case "create_topic_island": {
        const node = makeNode({
          title: asString(p.title) ?? "New topic",
          type: (asString(p.type) as MapNodeData["type"]) ?? "topic",
          oneLineSummary: asString(p.oneLineSummary) ?? "",
          detailSummary: asString(p.detailSummary),
          topicIslandId: newId("island"),
          sourceMessageIds: asString(p.sourceMessageId)
            ? [asString(p.sourceMessageId)!]
            : [],
        });
        nodes.push(node);
        if (asString(p.tempId)) tempIdToNodeId.set(asString(p.tempId)!, node.id);
        break;
      }

      case "create_edge": {
        const s = resolveRef(asString(p.sourceRef));
        const t = resolveRef(asString(p.targetRef));
        if (s && t) {
          addEdge(s, t, (asString(p.relation) as EdgeRelation) ?? "relates_to", asString(p.label));
        }
        break;
      }

      case "rename_node": {
        const id = resolveRef(asString(p.nodeId));
        const node = id ? byId(id) : undefined;
        if (node && !node.isLocked && asString(p.newTitle)) {
          node.title = asString(p.newTitle)!;
          node.updatedAt = nowIso();
        }
        break;
      }

      case "update_node_summary": {
        const id = resolveRef(asString(p.nodeId));
        const node = id ? byId(id) : undefined;
        if (node) {
          if (asString(p.oneLineSummary)) node.oneLineSummary = asString(p.oneLineSummary)!;
          if (asString(p.detailSummary)) node.detailSummary = asString(p.detailSummary)!;
          node.updatedAt = nowIso();
        }
        break;
      }

      case "change_edge_relation": {
        const edge = edges.find((e) => e.id === asString(p.edgeId));
        if (edge && asString(p.relation)) {
          edge.relation = asString(p.relation) as EdgeRelation;
        }
        break;
      }

      case "move_node": {
        const id = resolveRef(asString(p.nodeId));
        const newParent = resolveRef(asString(p.newParentId));
        const node = id ? byId(id) : undefined;
        const parent = newParent ? byId(newParent) : undefined;
        if (node && parent) {
          node.parentId = parent.id;
          node.topicIslandId = parent.topicIslandId;
          node.updatedAt = nowIso();
          for (const e of edges) {
            if (e.target === node.id) e.source = parent.id;
          }
        }
        break;
      }

      case "merge_nodes": {
        const ids = (Array.isArray(p.nodeIds) ? p.nodeIds : [])
          .map((r) => resolveRef(asString(r)))
          .filter((x): x is string => !!x);
        if (ids.length >= 2) {
          const [keepId, ...removeIds] = ids;
          const keep = byId(keepId);
          if (keep) {
            if (asString(p.newTitle)) keep.title = asString(p.newTitle)!;
            const removeSet = new Set(removeIds);
            // Re-point edges and children, then drop merged nodes.
            for (const e of edges) {
              if (removeSet.has(e.source)) e.source = keepId;
              if (removeSet.has(e.target)) e.target = keepId;
            }
            for (const n of nodes) {
              if (n.parentId && removeSet.has(n.parentId)) n.parentId = keepId;
            }
            for (const rid of removeSet) {
              const idx = nodes.findIndex((n) => n.id === rid);
              if (idx >= 0) nodes.splice(idx, 1);
            }
          }
        }
        break;
      }

      case "collapse_subtree":
        // Visual-only; handled by the canvas, not the data model.
        break;
    }
  }

  // Drop self-loops and edges to nodes that no longer exist.
  const present = new Set(nodes.map((n) => n.id));
  const cleanedEdges = edges.filter(
    (e) => e.source !== e.target && present.has(e.source) && present.has(e.target)
  );

  return { nodes, edges: cleanedEdges };
}

/** Build a one-line, human-readable summary of what a patch will do. */
export function describePatch(patch: MapPatch): string {
  const counts = new Map<string, number>();
  for (const op of patch.operations) {
    if (op.selected === false) continue;
    counts.set(op.type, (counts.get(op.type) ?? 0) + 1);
  }
  const parts = [...counts.entries()].map(
    ([type, n]) => `${n} ${type.replace(/_/g, " ")}`
  );
  return parts.join(", ") || "no changes";
}

/** Convenience: count nodes a generate result would add, and its max depth. */
export function estimateProposalShape(result: GenerateResult): {
  nodeCount: number;
  maxDepth: number;
} {
  const nodeCount = result.candidateCards.length;
  // Cards are a single level unless it's a chained flow.
  const maxDepth = result.intent === "generate_steps" ? 1 : 1;
  return { nodeCount, maxDepth };
}
