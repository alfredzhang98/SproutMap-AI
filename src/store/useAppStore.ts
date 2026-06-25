import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import type {
  CandidateCard,
  ChatMessage,
  EdgeRelation,
  MapEdgeData,
  MapNodeData,
} from "@/types/map";
import type { AllowedModel } from "@/types/llm";
import { DEFAULT_MODEL } from "@/types/llm";
import type {
  AutomationLevel,
  AutomationMode,
  GenerateResult,
  MapPatch,
  NodeMemoryResult,
  RefactorResult,
} from "@/types/agent";
import { newId, nowIso } from "@/lib/ids";
import {
  buildContextPayload,
  type ContextMode,
  type WorkspaceSnapshot,
} from "@/lib/context";
import { autoLayout } from "@/lib/layout";
import { classifyIntentHeuristic } from "@/lib/tools/intent";
import { decideAutomationLevel } from "@/lib/tools/automation";
import {
  findNodeIdByTitle,
  getNodePath,
  getRootNode,
  getSubtree,
  graphComplexityScore,
} from "@/lib/tools/graph";
import {
  applyMapPatch,
  describePatch,
  planMapPatchFromCards,
  type GraphState,
} from "@/lib/tools/patch";
import {
  exportWorkspaceJson,
  loadFromLocal,
  parseWorkspaceJson,
  saveToLocal,
  type PersistedWorkspace,
} from "@/lib/persistence";

export type AppNode = Node<{ map: MapNodeData }>;
export type AppEdge = Edge<{ map: MapEdgeData }>;

const API_KEY_STORAGE = "sproutmap.apiKey";
const MAX_UNDO = 20;

export type AutomationBanner = {
  level: AutomationLevel;
  reason: string;
  summary: string;
  applied: boolean;
  allowUndo: boolean;
};

function relationLabel(relation: EdgeRelation): string {
  return relation.replace(/_/g, " ");
}

function makeRfNode(map: MapNodeData, position: { x: number; y: number }): AppNode {
  return {
    id: map.id,
    type: map.type === "root" ? "root" : "map",
    position,
    data: { map },
  };
}

function makeRfEdge(map: MapEdgeData): AppEdge {
  return {
    id: map.id,
    source: map.source,
    target: map.target,
    label: map.label || relationLabel(map.relation),
    data: { map },
    animated: map.relation === "next_step",
    style: map.isSuggested ? { strokeDasharray: "4 4", opacity: 0.7 } : undefined,
  };
}

function defaultNodeData(
  partial: Partial<MapNodeData> & { title: string }
): MapNodeData {
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
    decisionLog: partial.decisionLog,
    openQuestions: partial.openQuestions,
    isDraft: partial.isDraft,
  };
}

/** Convert the RF node/edge view into a plain graph for the deterministic tools. */
function snapshotGraph(state: { nodes: AppNode[]; edges: AppEdge[] }): GraphState {
  return {
    nodes: state.nodes.map((n) => n.data.map),
    edges: state.edges.map((e) => e.data!.map),
  };
}

/** Rebuild RF nodes/edges from a plain graph, preserving existing positions. */
function rebuildFromGraph(prev: AppNode[], graph: GraphState): {
  nodes: AppNode[];
  edges: AppEdge[];
} {
  const prevPos = new Map(prev.map((n) => [n.id, n.position]));
  const placed = new Map<string, { x: number; y: number }>();
  const childCounter = new Map<string, number>();
  const islandSeen = new Set<string>();
  let islandIdx = 0;

  const nodes = graph.nodes.map((map) => {
    let position = prevPos.get(map.id);
    if (!position) {
      const parentPos = map.parentId
        ? prevPos.get(map.parentId) ?? placed.get(map.parentId)
        : undefined;
      if (parentPos) {
        const idx = childCounter.get(map.parentId!) ?? 0;
        childCounter.set(map.parentId!, idx + 1);
        position = { x: parentPos.x + 250, y: parentPos.y + idx * 100 };
      } else {
        if (!islandSeen.has(map.topicIslandId)) {
          islandSeen.add(map.topicIslandId);
          islandIdx += 1;
        }
        position = { x: 80 + islandIdx * 340, y: 80 + (placed.size % 6) * 44 };
      }
    }
    placed.set(map.id, position);
    return makeRfNode(map, position);
  });

  return { nodes, edges: graph.edges.map(makeRfEdge) };
}

type AppState = {
  workspaceTitle: string;
  nodes: AppNode[];
  edges: AppEdge[];
  messages: ChatMessage[];
  candidateCards: CandidateCard[];
  selectedNodeId?: string;
  selectedEdgeId?: string;
  apiKey?: string;
  model: AllowedModel;
  contextMode: ContextMode;
  automationMode: AutomationMode;
  pendingPatch?: MapPatch;
  lastAutomation?: AutomationBanner;
  undoStack: GraphState[];
  isSending: boolean;
  isRefactoring: boolean;
  error?: string;
  hydrated: boolean;

  // settings
  setApiKey: (key?: string) => void;
  setModel: (model: AllowedModel) => void;
  setContextMode: (mode: ContextMode) => void;
  setAutomationMode: (mode: AutomationMode) => void;
  setWorkspaceTitle: (title: string) => void;

  // react-flow
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setSelectedNode: (id?: string) => void;
  setSelectedEdge: (id?: string) => void;

  // chat / agent pipeline
  sendMessage: (content: string) => Promise<void>;
  runRefactor: (instruction?: string) => Promise<void>;
  summarizeNode: (nodeId: string) => Promise<void>;
  clearError: () => void;
  dismissAutomationBanner: () => void;

  // map patch
  togglePatchOp: (opId: string) => void;
  acceptPatch: () => void;
  rejectPatch: () => void;
  undoLastMapChange: () => void;

  // candidate cards
  addCandidateToNode: (cardId: string, parentNodeId: string) => void;
  addCandidateAsIsland: (cardId: string, position: { x: number; y: number }) => void;
  insertCandidateOnEdge: (cardId: string, edgeId: string) => void;
  acceptAllCandidates: () => void;
  discardCandidate: (cardId: string) => void;
  deferCandidate: (cardId: string) => void;
  updateCandidate: (cardId: string, patch: Partial<CandidateCard>) => void;

  // map editing
  updateNodeData: (nodeId: string, patch: Partial<MapNodeData>) => void;
  updateEdgeData: (edgeId: string, patch: Partial<MapEdgeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  addManualChild: (parentId: string) => void;

  // layout & persistence
  runAutoLayout: () => void;
  saveWorkspace: () => void;
  loadWorkspace: () => void;
  hydrate: () => void;
  newWorkspace: () => void;
  exportJson: () => void;
  importJson: (text: string) => boolean;
};

function snapshot(state: AppState): WorkspaceSnapshot {
  return {
    workspaceTitle: state.workspaceTitle,
    nodes: state.nodes.map((n) => n.data.map),
    edges: state.edges.map((e) => e.data!.map),
    messages: state.messages,
  };
}

function persist(state: AppState) {
  const payload: PersistedWorkspace = {
    version: 1,
    workspaceTitle: state.workspaceTitle,
    nodes: state.nodes,
    edges: state.edges,
    messages: state.messages,
    candidateCards: state.candidateCards,
    model: state.model,
    contextMode: state.contextMode,
    automationMode: state.automationMode,
    savedAt: nowIso(),
  };
  saveToLocal(payload);
}

export const useAppStore = create<AppState>((set, get) => ({
  workspaceTitle: "Untitled workspace",
  nodes: [],
  edges: [],
  messages: [],
  candidateCards: [],
  model: DEFAULT_MODEL,
  contextMode: "selected_node",
  automationMode: "balanced",
  undoStack: [],
  isSending: false,
  isRefactoring: false,
  hydrated: false,

  setApiKey: (key) => {
    if (typeof window !== "undefined") {
      if (key) window.sessionStorage.setItem(API_KEY_STORAGE, key);
      else window.sessionStorage.removeItem(API_KEY_STORAGE);
    }
    set({ apiKey: key });
  },
  setModel: (model) => {
    set({ model });
    persist(get());
  },
  setContextMode: (contextMode) => {
    set({ contextMode });
    persist(get());
  },
  setAutomationMode: (automationMode) => {
    set({ automationMode });
    persist(get());
  },
  setWorkspaceTitle: (workspaceTitle) => {
    set({ workspaceTitle });
    persist(get());
  },

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as AppNode[] });
    const settle = changes.some(
      (c) => c.type === "remove" || (c.type === "position" && !c.dragging)
    );
    if (settle) persist(get());
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) as AppEdge[] });
    if (changes.some((c) => c.type === "remove")) persist(get());
  },
  onConnect: (connection) => {
    if (!connection.source || !connection.target) return;
    const mapEdge: MapEdgeData = {
      id: newId("edge"),
      source: connection.source,
      target: connection.target,
      relation: "relates_to",
      createdBy: "user",
    };
    set({ edges: addEdge(makeRfEdge(mapEdge), get().edges) as AppEdge[] });
    persist(get());
  },
  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: undefined }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: undefined }),

  clearError: () => set({ error: undefined }),
  dismissAutomationBanner: () => set({ lastAutomation: undefined }),

  // ── Main agent pipeline ────────────────────────────────────────────────
  sendMessage: async (content) => {
    const state = get();
    const trimmed = content.trim();
    if (!trimmed) return;
    if (!state.apiKey) {
      set({ error: "Add your Gemini API key first." });
      return;
    }

    const userMessage: ChatMessage = {
      id: newId("msg"),
      role: "user",
      content: trimmed,
      createdAt: nowIso(),
      selectedNodeId: state.selectedNodeId,
    };
    set({
      messages: [...state.messages, userMessage],
      isSending: true,
      error: undefined,
    });

    // Tool: deterministic intent pre-pass.
    const hint = classifyIntentHeuristic(
      trimmed,
      !!state.selectedNodeId,
      state.nodes.length > 0
    );

    // Tool: context builder.
    const contextPayload = buildContextPayload({
      workspace: snapshot(get()),
      selectedNodeId: state.selectedNodeId,
      contextMode: state.contextMode,
      userQuestion: trimmed,
    });

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "generate",
          apiKey: state.apiKey,
          model: state.model,
          contextPayload,
          userQuestion: trimmed,
          hint,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed.");
      applyGenerateResult(set, get, json.data as GenerateResult, hint);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Request failed." });
    } finally {
      set({ isSending: false });
      persist(get());
    }
  },

  runRefactor: async (instruction) => {
    const state = get();
    if (!state.apiKey) {
      set({ error: "Add your Gemini API key first." });
      return;
    }
    if (state.nodes.length === 0) {
      set({ error: "There is nothing on the map to refactor yet." });
      return;
    }
    const text = (instruction || "Reorganize the current map to be clearer.").trim();
    set({ isRefactoring: true, error: undefined });

    const graphPayload = {
      nodes: state.nodes.map((n) => ({
        id: n.data.map.id,
        title: n.data.map.title,
        type: n.data.map.type,
        summary: n.data.map.oneLineSummary,
        parentId: n.data.map.parentId,
        island: n.data.map.topicIslandId,
      })),
      edges: state.edges.map((e) => ({
        id: e.data!.map.id,
        source: e.data!.map.source,
        target: e.data!.map.target,
        relation: e.data!.map.relation,
      })),
    };

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "refactor",
          apiKey: state.apiKey,
          model: state.model,
          graphPayload,
          userInstruction: text,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed.");
      const result = json.data as RefactorResult;
      const patch: MapPatch = {
        id: newId("patch"),
        summary: result.summary,
        intent: "refactor_map",
        automationLevel: "patch_preview",
        operations: result.operations.map((o) => ({
          id: newId("op"),
          type: o.type,
          payload: o.payload,
          confidence: o.confidence,
          explanation: o.explanation,
          selected: true,
        })),
        createdBy: "ai",
        status: "pending",
        createdAt: nowIso(),
      };
      set({
        pendingPatch: patch,
        lastAutomation: {
          level: "patch_preview",
          reason: "Refactor proposed — review before applying.",
          summary: result.summary,
          applied: false,
          allowUndo: true,
        },
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Request failed." });
    } finally {
      set({ isRefactoring: false });
      persist(get());
    }
  },

  summarizeNode: async (nodeId) => {
    const state = get();
    if (!state.apiKey) {
      set({ error: "Add your Gemini API key first." });
      return;
    }
    const node = state.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const allMaps = state.nodes.map((n) => n.data.map);
    const payload = {
      node: {
        title: node.data.map.title,
        type: node.data.map.type,
        shortSummary: node.data.map.oneLineSummary,
        detailSummary: node.data.map.detailSummary,
        userNotes: node.data.map.userNotes,
        decisionLog: node.data.map.decisionLog,
        openQuestions: node.data.map.openQuestions,
      },
      path: getNodePath(nodeId, allMaps).map((n) => n.title),
      children: getSubtree(nodeId, allMaps).map((n) => ({
        title: n.title,
        summary: n.oneLineSummary,
      })),
      recentMessages: state.messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
    set({ error: undefined });
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "summarize",
          apiKey: state.apiKey,
          model: state.model,
          memoryPayload: payload,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed.");
      const mem = json.data as NodeMemoryResult;
      get().updateNodeData(nodeId, {
        oneLineSummary: mem.shortSummary || node.data.map.oneLineSummary,
        detailSummary: mem.detailSummary || node.data.map.detailSummary,
        decisionLog: mem.decisionLog,
        openQuestions: mem.openQuestions,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Request failed." });
    }
  },

  // ── Map patch ────────────────────────────────────────────────────────────
  togglePatchOp: (opId) => {
    const patch = get().pendingPatch;
    if (!patch) return;
    set({
      pendingPatch: {
        ...patch,
        operations: patch.operations.map((o) =>
          o.id === opId ? { ...o, selected: o.selected === false } : o
        ),
      },
    });
  },
  acceptPatch: () => {
    const state = get();
    const patch = state.pendingPatch;
    if (!patch) return;
    applyPatchInternal(set, get, patch, { autoLayoutAfter: false });
    // Mark any cards referenced by this patch as accepted.
    const acceptedCardIds = new Set(
      patch.operations
        .map((o) => o.payload?.tempId)
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.replace(/^t_/, ""))
    );
    set({
      pendingPatch: undefined,
      candidateCards: get().candidateCards.map((c) =>
        acceptedCardIds.has(c.id) ? { ...c, status: "accepted" } : c
      ),
      lastAutomation: {
        level: patch.automationLevel,
        reason: "Patch applied.",
        summary: describePatch(patch),
        applied: true,
        allowUndo: true,
      },
    });
    persist(get());
  },
  rejectPatch: () => {
    set({ pendingPatch: undefined, lastAutomation: undefined });
    persist(get());
  },
  undoLastMapChange: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    const rebuilt = rebuildFromGraph(get().nodes, prev);
    set({
      nodes: rebuilt.nodes,
      edges: rebuilt.edges,
      undoStack: stack.slice(0, -1),
      lastAutomation: undefined,
    });
    persist(get());
  },

  // ── Candidate cards (manual paths) ─────────────────────────────────────────
  addCandidateToNode: (cardId, parentNodeId) => {
    const state = get();
    const card = state.candidateCards.find((c) => c.id === cardId);
    const parent = state.nodes.find((n) => n.id === parentNodeId);
    if (!card || !parent) return;

    const relation: EdgeRelation = card.suggestedRelation ?? "contains";
    const childCount = state.nodes.filter(
      (n) => n.data.map.parentId === parentNodeId
    ).length;

    const map = defaultNodeData({
      title: card.title,
      type: card.type,
      oneLineSummary: card.oneLineSummary,
      detailSummary: card.detailSummary,
      sourceMessageIds: [card.sourceMessageId],
      parentId: parentNodeId,
      topicIslandId: parent.data.map.topicIslandId,
      orderIndex: childCount,
      createdBy: "ai",
    });
    const position = {
      x: parent.position.x + 60,
      y: parent.position.y + 120 + childCount * 30,
    };
    const edgeData: MapEdgeData = {
      id: newId("edge"),
      source: parentNodeId,
      target: map.id,
      relation,
      createdBy: "ai",
    };
    set({
      nodes: [...state.nodes, makeRfNode(map, position)],
      edges: [...state.edges, makeRfEdge(edgeData)],
      candidateCards: state.candidateCards.map((c) =>
        c.id === cardId ? { ...c, status: "accepted" } : c
      ),
      selectedNodeId: map.id,
      selectedEdgeId: undefined,
    });
    persist(get());
  },

  addCandidateAsIsland: (cardId, position) => {
    const state = get();
    const card = state.candidateCards.find((c) => c.id === cardId);
    if (!card) return;
    const map = defaultNodeData({
      title: card.title,
      type: card.type === "root" ? "topic" : card.type,
      oneLineSummary: card.oneLineSummary,
      detailSummary: card.detailSummary,
      sourceMessageIds: [card.sourceMessageId],
      topicIslandId: newId("island"),
      createdBy: "ai",
    });
    set({
      nodes: [...state.nodes, makeRfNode(map, position)],
      candidateCards: state.candidateCards.map((c) =>
        c.id === cardId ? { ...c, status: "accepted" } : c
      ),
      selectedNodeId: map.id,
      selectedEdgeId: undefined,
    });
    persist(get());
  },

  insertCandidateOnEdge: (cardId, edgeId) => {
    const state = get();
    const card = state.candidateCards.find((c) => c.id === cardId);
    const edge = state.edges.find((e) => e.id === edgeId);
    if (!card || !edge) return;
    const source = state.nodes.find((n) => n.id === edge.source);
    const target = state.nodes.find((n) => n.id === edge.target);
    if (!source || !target) return;

    const relation = edge.data!.map.relation;
    const position = {
      x: (source.position.x + target.position.x) / 2,
      y: (source.position.y + target.position.y) / 2,
    };
    const map = defaultNodeData({
      title: card.title,
      type: card.type,
      oneLineSummary: card.oneLineSummary,
      detailSummary: card.detailSummary,
      sourceMessageIds: [card.sourceMessageId],
      parentId: source.id,
      topicIslandId: source.data.map.topicIslandId,
      createdBy: "ai",
    });
    const updatedTargetMap: MapNodeData = {
      ...target.data.map,
      parentId: map.id,
      updatedAt: nowIso(),
    };
    const edgeA: MapEdgeData = {
      id: newId("edge"),
      source: source.id,
      target: map.id,
      relation,
      createdBy: "ai",
    };
    const edgeB: MapEdgeData = {
      id: newId("edge"),
      source: map.id,
      target: target.id,
      relation,
      createdBy: "ai",
    };
    set({
      nodes: [
        ...state.nodes.map((n) =>
          n.id === target.id ? { ...n, data: { map: updatedTargetMap } } : n
        ),
        makeRfNode(map, position),
      ],
      edges: [
        ...state.edges.filter((e) => e.id !== edgeId),
        makeRfEdge(edgeA),
        makeRfEdge(edgeB),
      ],
      candidateCards: state.candidateCards.map((c) =>
        c.id === cardId ? { ...c, status: "accepted" } : c
      ),
      selectedNodeId: map.id,
    });
    persist(get());
  },

  acceptAllCandidates: () => {
    const pending = get().candidateCards.filter((c) => c.status === "pending");
    for (const card of pending) {
      const parentId = card.suggestedParentId ?? get().nodes[0]?.id;
      if (parentId) get().addCandidateToNode(card.id, parentId);
      else
        get().addCandidateAsIsland(card.id, {
          x: 200 + Math.random() * 200,
          y: 200 + Math.random() * 200,
        });
    }
  },

  discardCandidate: (cardId) => {
    set({
      candidateCards: get().candidateCards.map((c) =>
        c.id === cardId ? { ...c, status: "discarded" } : c
      ),
    });
    persist(get());
  },
  deferCandidate: (cardId) => {
    set({
      candidateCards: get().candidateCards.map((c) =>
        c.id === cardId
          ? { ...c, status: c.status === "deferred" ? "pending" : "deferred" }
          : c
      ),
    });
    persist(get());
  },
  updateCandidate: (cardId, patch) => {
    set({
      candidateCards: get().candidateCards.map((c) =>
        c.id === cardId ? { ...c, ...patch } : c
      ),
    });
  },

  // ── Map editing ────────────────────────────────────────────────────────────
  updateNodeData: (nodeId, patch) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              type: (patch.type ?? n.data.map.type) === "root" ? "root" : "map",
              data: { map: { ...n.data.map, ...patch, updatedAt: nowIso() } },
            }
          : n
      ),
    });
    persist(get());
  },
  updateEdgeData: (edgeId, patch) => {
    set({
      edges: get().edges.map((e) => {
        if (e.id !== edgeId) return e;
        const nextMap: MapEdgeData = { ...e.data!.map, ...patch };
        return {
          ...e,
          label: nextMap.label || relationLabel(nextMap.relation),
          animated: nextMap.relation === "next_step",
          data: { map: nextMap },
        };
      }),
    });
    persist(get());
  },
  deleteNode: (nodeId) => {
    const state = get();
    set({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId:
        state.selectedNodeId === nodeId ? undefined : state.selectedNodeId,
    });
    persist(get());
  },
  deleteEdge: (edgeId) => {
    const state = get();
    set({
      edges: state.edges.filter((e) => e.id !== edgeId),
      selectedEdgeId:
        state.selectedEdgeId === edgeId ? undefined : state.selectedEdgeId,
    });
    persist(get());
  },
  addManualChild: (parentId) => {
    const state = get();
    const parent = state.nodes.find((n) => n.id === parentId);
    if (!parent) return;
    const childCount = state.nodes.filter(
      (n) => n.data.map.parentId === parentId
    ).length;
    const map = defaultNodeData({
      title: "New node",
      type: "concept",
      oneLineSummary: "",
      parentId,
      topicIslandId: parent.data.map.topicIslandId,
      orderIndex: childCount,
      createdBy: "user",
    });
    const position = {
      x: parent.position.x + 60,
      y: parent.position.y + 120 + childCount * 30,
    };
    const edgeData: MapEdgeData = {
      id: newId("edge"),
      source: parentId,
      target: map.id,
      relation: "contains",
      createdBy: "user",
    };
    set({
      nodes: [...state.nodes, makeRfNode(map, position)],
      edges: [...state.edges, makeRfEdge(edgeData)],
      selectedNodeId: map.id,
    });
    persist(get());
  },

  runAutoLayout: () => {
    set({ nodes: autoLayout(get().nodes, get().edges) });
    persist(get());
  },

  saveWorkspace: () => persist(get()),
  loadWorkspace: () => get().hydrate(),
  hydrate: () => {
    const persisted = loadFromLocal();
    const apiKey =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(API_KEY_STORAGE) ?? undefined
        : undefined;
    if (!persisted) {
      set({ hydrated: true, apiKey });
      return;
    }
    set({
      workspaceTitle: persisted.workspaceTitle,
      nodes: persisted.nodes,
      edges: persisted.edges,
      messages: persisted.messages,
      candidateCards: persisted.candidateCards,
      model: persisted.model ?? DEFAULT_MODEL,
      contextMode: persisted.contextMode ?? "selected_node",
      automationMode: persisted.automationMode ?? "balanced",
      apiKey,
      hydrated: true,
    });
  },
  newWorkspace: () => {
    set({
      workspaceTitle: "Untitled workspace",
      nodes: [],
      edges: [],
      messages: [],
      candidateCards: [],
      pendingPatch: undefined,
      lastAutomation: undefined,
      undoStack: [],
      selectedNodeId: undefined,
      selectedEdgeId: undefined,
      error: undefined,
    });
    persist(get());
  },
  exportJson: () => {
    const state = get();
    exportWorkspaceJson({
      version: 1,
      workspaceTitle: state.workspaceTitle,
      nodes: state.nodes,
      edges: state.edges,
      messages: state.messages,
      candidateCards: state.candidateCards,
      model: state.model,
      contextMode: state.contextMode,
      automationMode: state.automationMode,
      savedAt: nowIso(),
    });
  },
  importJson: (text) => {
    const parsed = parseWorkspaceJson(text);
    if (!parsed) return false;
    set({
      workspaceTitle: parsed.workspaceTitle ?? "Imported workspace",
      nodes: parsed.nodes ?? [],
      edges: parsed.edges ?? [],
      messages: parsed.messages ?? [],
      candidateCards: parsed.candidateCards ?? [],
      model: parsed.model ?? DEFAULT_MODEL,
      contextMode: parsed.contextMode ?? "selected_node",
      automationMode: parsed.automationMode ?? "balanced",
      pendingPatch: undefined,
      undoStack: [],
      selectedNodeId: undefined,
      selectedEdgeId: undefined,
    });
    persist(get());
    return true;
  },
}));

type SetFn = (partial: Partial<AppState>) => void;
type GetFn = () => AppState;

/** Apply a patch to the live RF graph, snapshotting the previous graph for undo. */
function applyPatchInternal(
  set: SetFn,
  get: GetFn,
  patch: MapPatch,
  opts: { autoLayoutAfter: boolean }
) {
  const before = snapshotGraph(get());
  const after = applyMapPatch(before, patch);
  const rebuilt = rebuildFromGraph(get().nodes, after);
  const nextNodes = opts.autoLayoutAfter
    ? autoLayout(rebuilt.nodes, rebuilt.edges)
    : rebuilt.nodes;
  set({
    nodes: nextNodes,
    edges: rebuilt.edges,
    undoStack: [...get().undoStack, before].slice(-MAX_UNDO),
  });
}

/**
 * Orchestrate the result of the generate skill: append the answer, ensure a
 * root exists, stage candidate cards, then choose an automation level and act
 * on it (cards only / ghost preview / scoped auto-add / patch preview / draft).
 */
function applyGenerateResult(
  set: SetFn,
  get: GetFn,
  data: GenerateResult,
  hint: { explicitMapCommand: boolean }
) {
  const state = get();
  const assistantMessage: ChatMessage = {
    id: newId("msg"),
    role: "assistant",
    content: data.answer || data.mapPatchSummary || "(no answer)",
    createdAt: nowIso(),
  };

  let nodes = state.nodes;
  let workspaceTitle = state.workspaceTitle;
  let rootId = getRootNode(nodes.map((n) => n.data.map))?.id;

  // Create a root if none exists yet (and the turn intends to build a map).
  const wantsMap =
    data.shouldCreateCards ||
    data.candidateCards.length > 0 ||
    data.intent === "create_root";
  if (!rootId && wantsMap) {
    const title =
      data.workspaceTitleSuggestion?.trim() || state.workspaceTitle || "New map";
    const rootMap = defaultNodeData({
      title,
      type: "root",
      oneLineSummary: data.mapPatchSummary || "Workspace root",
      topicIslandId: "island_root",
      sourceMessageIds: [assistantMessage.id],
      createdBy: "ai",
    });
    rootId = rootMap.id;
    nodes = [...nodes, makeRfNode(rootMap, { x: 360, y: 60 })];
  }
  if (
    (!workspaceTitle || workspaceTitle === "Untitled workspace") &&
    data.workspaceTitleSuggestion
  ) {
    workspaceTitle = data.workspaceTitleSuggestion.trim();
  }

  // Resolve a suggested parent for each card.
  const maps = nodes.map((n) => n.data.map);
  const resolveParent = (parentTitle?: string): string | undefined => {
    if (data.intent === "create_discrete_topic") return undefined;
    if (parentTitle) {
      const hit = findNodeIdByTitle(parentTitle, maps);
      if (hit) return hit;
    }
    if (state.selectedNodeId && state.contextMode !== "global") {
      return state.selectedNodeId;
    }
    return rootId;
  };

  const cards: CandidateCard[] = data.candidateCards.map((draft) => ({
    id: newId("card"),
    title: draft.title,
    type: draft.type,
    oneLineSummary: draft.oneLineSummary,
    detailSummary: draft.detailSummary,
    suggestedParentId: resolveParent(draft.suggestedParentTitle),
    suggestedParentTitle: draft.suggestedParentTitle,
    suggestedRelation: draft.suggestedRelation,
    confidence: draft.confidence,
    sourceMessageId: assistantMessage.id,
    status: "pending",
  }));

  // Commit answer + root + staged cards first.
  set({
    nodes,
    workspaceTitle,
    messages: [
      ...get().messages,
      { ...assistantMessage, generatedCardIds: cards.map((c) => c.id) },
    ],
    candidateCards: [...state.candidateCards, ...cards],
  });

  // Tool: decide how far to automate this turn.
  const avgConfidence =
    cards.length > 0
      ? cards.reduce((s, c) => s + c.confidence, 0) / cards.length
      : 0;
  const decision = decideAutomationLevel({
    intent: data.intent,
    userExplicitCommand: hint.explicitMapCommand,
    selectedNodeId: state.selectedNodeId,
    relationConfidence: avgConfidence,
    relevanceToSelectedNode: data.relevanceToSelectedNode,
    proposedNodeCount: cards.length,
    proposedMaxDepth: 1,
    modifiesExistingStructure: false,
    createsCrossTopicEdges: false,
    createsNewTopicIsland: data.intent === "create_discrete_topic",
    graphComplexityScore: graphComplexityScore(
      get().nodes.map((n) => n.data.map),
      get().edges.map((e) => e.data!.map)
    ),
    userAutomationPreference: state.automationMode,
  });

  const summary = data.mapPatchSummary || describeCards(cards);

  // Act on the decision.
  if (cards.length === 0) {
    set({
      lastAutomation: {
        level: "none",
        reason: decision.reason,
        summary: "Answered — no cards proposed.",
        applied: true,
        allowUndo: false,
      },
    });
    return;
  }

  if (
    decision.level === "auto_add_scoped" ||
    decision.level === "full_auto_draft"
  ) {
    const patch = planMapPatchFromCards({
      cards,
      nodes: get().nodes.map((n) => n.data.map),
      intent: data.intent,
      automationLevel: decision.level,
      selectedNodeId: state.selectedNodeId,
      summary,
    });
    applyPatchInternal(set, get, patch, {
      autoLayoutAfter: decision.level === "full_auto_draft",
    });
    const accepted = new Set(cards.map((c) => c.id));
    set({
      candidateCards: get().candidateCards.map((c) =>
        accepted.has(c.id) ? { ...c, status: "accepted" } : c
      ),
      lastAutomation: {
        level: decision.level,
        reason: decision.reason,
        summary: describePatch(patch),
        applied: true,
        allowUndo: decision.allowUndo,
      },
    });
    return;
  }

  if (decision.level === "patch_preview") {
    const patch = planMapPatchFromCards({
      cards,
      nodes: get().nodes.map((n) => n.data.map),
      intent: data.intent,
      automationLevel: "patch_preview",
      selectedNodeId: state.selectedNodeId,
      summary,
    });
    set({
      pendingPatch: patch,
      lastAutomation: {
        level: "patch_preview",
        reason: decision.reason,
        summary,
        applied: false,
        allowUndo: true,
      },
    });
    return;
  }

  // ghost_preview / candidate_only — cards stay in the tray (ghosts derive
  // from high-confidence cards in the canvas).
  set({
    lastAutomation: {
      level: decision.level,
      reason: decision.reason,
      summary,
      applied: false,
      allowUndo: false,
    },
  });
}

function describeCards(cards: CandidateCard[]): string {
  return `${cards.length} candidate card${cards.length === 1 ? "" : "s"} proposed`;
}
