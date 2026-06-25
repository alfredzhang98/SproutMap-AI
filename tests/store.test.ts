import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import type { CandidateCard } from "@/types/map";
import type { GenerateResult } from "@/types/agent";
import { makeEdge, makeMap, makeNode } from "./factories";

function resetStore() {
  useAppStore.setState({
    workspaceTitle: "Untitled workspace",
    nodes: [],
    edges: [],
    messages: [],
    candidateCards: [],
    selectedNodeId: undefined,
    selectedEdgeId: undefined,
    apiKey: undefined,
    contextMode: "selected_node",
    automationMode: "balanced",
    pendingPatch: undefined,
    lastAutomation: undefined,
    undoStack: [],
    isSending: false,
    isRefactoring: false,
    error: undefined,
  });
}

function card(partial: Partial<CandidateCard> & { id: string }): CandidateCard {
  return {
    id: partial.id,
    title: partial.title ?? "Card",
    type: partial.type ?? "concept",
    oneLineSummary: partial.oneLineSummary ?? "summary",
    detailSummary: partial.detailSummary,
    suggestedParentId: partial.suggestedParentId,
    suggestedRelation: partial.suggestedRelation,
    confidence: partial.confidence ?? 0.6,
    sourceMessageId: partial.sourceMessageId ?? "msg1",
    status: partial.status ?? "pending",
  };
}

beforeEach(resetStore);
afterEach(() => vi.restoreAllMocks());

describe("candidate cards → map", () => {
  it("addCandidateToNode creates a child node + edge and marks the card accepted", () => {
    const parent = makeNode(makeMap({ id: "p", title: "Parent", type: "topic" }));
    useAppStore.setState({
      nodes: [parent],
      candidateCards: [card({ id: "c1", title: "Child", suggestedRelation: "option_of" })],
    });

    useAppStore.getState().addCandidateToNode("c1", "p");
    const s = useAppStore.getState();

    expect(s.nodes).toHaveLength(2);
    const child = s.nodes.find((n) => n.id !== "p")!;
    expect(child.data.map.title).toBe("Child");
    expect(child.data.map.parentId).toBe("p");
    expect(s.edges).toHaveLength(1);
    expect(s.edges[0].data!.map.relation).toBe("option_of");
    expect(s.candidateCards[0].status).toBe("accepted");
    expect(s.selectedNodeId).toBe(child.id);
  });

  it("addCandidateToNode defaults the relation to 'contains'", () => {
    const parent = makeNode(makeMap({ id: "p", title: "Parent" }));
    useAppStore.setState({ nodes: [parent], candidateCards: [card({ id: "c1" })] });
    useAppStore.getState().addCandidateToNode("c1", "p");
    expect(useAppStore.getState().edges[0].data!.map.relation).toBe("contains");
  });

  it("addCandidateAsIsland creates an unparented node with a fresh island id", () => {
    useAppStore.setState({ candidateCards: [card({ id: "c1", title: "Island" })] });
    useAppStore.getState().addCandidateAsIsland("c1", { x: 100, y: 200 });
    const s = useAppStore.getState();
    expect(s.nodes).toHaveLength(1);
    expect(s.nodes[0].data.map.parentId).toBeUndefined();
    expect(s.nodes[0].position).toEqual({ x: 100, y: 200 });
    expect(s.candidateCards[0].status).toBe("accepted");
  });

  it("insertCandidateOnEdge inserts a node between endpoints and re-parents the target", () => {
    const a = makeNode(makeMap({ id: "a", title: "A" }), 0, 0);
    const b = makeNode(makeMap({ id: "b", title: "B", parentId: "a" }), 200, 200);
    const edge = makeEdge("a", "b", { id: "e1", relation: "next_step" });
    useAppStore.setState({
      nodes: [a, b],
      edges: [edge],
      candidateCards: [card({ id: "c1", title: "Mid" })],
    });

    useAppStore.getState().insertCandidateOnEdge("c1", "e1");
    const s = useAppStore.getState();

    expect(s.nodes).toHaveLength(3);
    const mid = s.nodes.find((n) => n.data.map.title === "Mid")!;
    expect(mid.data.map.parentId).toBe("a");
    // original edge removed, two new edges present
    expect(s.edges.find((e) => e.id === "e1")).toBeUndefined();
    expect(s.edges).toHaveLength(2);
    expect(s.edges.every((e) => e.data!.map.relation === "next_step")).toBe(true);
    // B re-parented under the inserted node
    expect(s.nodes.find((n) => n.id === "b")!.data.map.parentId).toBe(mid.id);
  });

  it("acceptAllCandidates accepts every pending card under its suggested parent", () => {
    const root = makeNode(makeMap({ id: "root", title: "Root", type: "root" }));
    useAppStore.setState({
      nodes: [root],
      candidateCards: [
        card({ id: "c1", suggestedParentId: "root" }),
        card({ id: "c2", suggestedParentId: "root" }),
      ],
    });
    useAppStore.getState().acceptAllCandidates();
    const s = useAppStore.getState();
    expect(s.nodes).toHaveLength(3);
    expect(s.candidateCards.every((c) => c.status === "accepted")).toBe(true);
  });

  it("discardCandidate marks a card discarded without touching the map", () => {
    useAppStore.setState({ candidateCards: [card({ id: "c1" })] });
    useAppStore.getState().discardCandidate("c1");
    expect(useAppStore.getState().candidateCards[0].status).toBe("discarded");
    expect(useAppStore.getState().nodes).toHaveLength(0);
  });
});

describe("map editing", () => {
  it("deleteNode removes the node and all connected edges", () => {
    const a = makeNode(makeMap({ id: "a", title: "A" }));
    const b = makeNode(makeMap({ id: "b", title: "B" }));
    const c = makeNode(makeMap({ id: "c", title: "C" }));
    useAppStore.setState({
      nodes: [a, b, c],
      edges: [makeEdge("a", "b", { id: "e1" }), makeEdge("b", "c", { id: "e2" })],
      selectedNodeId: "b",
    });
    useAppStore.getState().deleteNode("b");
    const s = useAppStore.getState();
    expect(s.nodes.map((n) => n.id).sort()).toEqual(["a", "c"]);
    expect(s.edges).toHaveLength(0);
    expect(s.selectedNodeId).toBeUndefined();
  });

  it("updateEdgeData updates relation, label and derived animation", () => {
    useAppStore.setState({
      nodes: [makeNode(makeMap({ id: "a", title: "A" })), makeNode(makeMap({ id: "b", title: "B" }))],
      edges: [makeEdge("a", "b", { id: "e1", relation: "contains" })],
    });
    useAppStore.getState().updateEdgeData("e1", { relation: "next_step", label: "then" });
    const e = useAppStore.getState().edges[0];
    expect(e.data!.map.relation).toBe("next_step");
    expect(e.label).toBe("then");
    expect(e.animated).toBe(true);
  });

  it("updateNodeData patches data and keeps the react-flow node type in sync", () => {
    useAppStore.setState({ nodes: [makeNode(makeMap({ id: "a", title: "A", type: "concept" }))] });
    useAppStore.getState().updateNodeData("a", { title: "A2", type: "root" });
    const n = useAppStore.getState().nodes[0];
    expect(n.data.map.title).toBe("A2");
    expect(n.type).toBe("root");
  });

  it("addManualChild creates a user node linked by a 'contains' edge", () => {
    useAppStore.setState({ nodes: [makeNode(makeMap({ id: "p", title: "P" }))] });
    useAppStore.getState().addManualChild("p");
    const s = useAppStore.getState();
    expect(s.nodes).toHaveLength(2);
    const child = s.nodes.find((n) => n.id !== "p")!;
    expect(child.data.map.createdBy).toBe("user");
    expect(s.edges[0].data!.map.relation).toBe("contains");
  });
});

describe("sendMessage (mocked agent pipeline)", () => {
  function result(p: Partial<GenerateResult>): GenerateResult {
    return {
      intent: "create_root",
      intentConfidence: 0.8,
      shouldCreateCards: true,
      preferredMapMode: "tree",
      relevanceToSelectedNode: 0.4,
      answer: "Here is an answer.",
      mapPatchSummary: "patch",
      candidateCards: [],
      ...p,
    };
  }
  function mockResponse(data: GenerateResult) {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data }),
    })) as unknown as typeof fetch;
  }

  it("requires an API key", async () => {
    await useAppStore.getState().sendMessage("hello");
    expect(useAppStore.getState().error).toMatch(/API key/i);
    expect(useAppStore.getState().messages).toHaveLength(0);
  });

  it("creates a root node and stages candidate cards on first message", async () => {
    useAppStore.setState({ apiKey: "k", automationMode: "balanced" });
    mockResponse(
      result({
        workspaceTitleSuggestion: "My Map",
        intent: "create_root",
        candidateCards: [
          { tempId: "t1", title: "Idea 1", type: "concept", oneLineSummary: "s", confidence: 0.9 },
          { tempId: "t2", title: "Idea 2", type: "method", oneLineSummary: "s", confidence: 0.5 },
        ],
      })
    );

    await useAppStore.getState().sendMessage("Design a tool");
    const s = useAppStore.getState();

    expect(s.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    // Root auto-created; cards staged (balanced + non-explicit → candidate only).
    expect(s.nodes).toHaveLength(1);
    expect(s.nodes[0].data.map.type).toBe("root");
    expect(s.workspaceTitle).toBe("My Map");
    expect(s.candidateCards).toHaveLength(2);
    expect(s.candidateCards.every((c) => c.status === "pending")).toBe(true);
    expect(s.candidateCards.every((c) => c.suggestedParentId === s.nodes[0].id)).toBe(true);
    expect(s.isSending).toBe(false);
  });

  it("auto-adds scoped structure on an explicit flow request under a selected node", async () => {
    const root = makeNode(makeMap({ id: "root", title: "Root", type: "root" }));
    useAppStore.setState({
      apiKey: "k",
      automationMode: "balanced",
      nodes: [root],
      selectedNodeId: "root",
      contextMode: "selected_node",
    });
    mockResponse(
      result({
        intent: "generate_steps",
        relevanceToSelectedNode: 0.9,
        candidateCards: [
          { tempId: "t1", title: "Step 1", type: "step", oneLineSummary: "s", confidence: 0.9 },
          { tempId: "t2", title: "Step 2", type: "step", oneLineSummary: "s", confidence: 0.9 },
        ],
      })
    );

    // "生成" is an explicit map command → scoped auto-add.
    await useAppStore.getState().sendMessage("帮我生成这个流程的步骤");
    const s = useAppStore.getState();

    expect(s.nodes.length).toBe(3); // root + 2 steps
    expect(s.candidateCards.every((c) => c.status === "accepted")).toBe(true);
    expect(s.lastAutomation?.level).toBe("auto_add_scoped");
    expect(s.undoStack.length).toBe(1);
  });

  it("surfaces server errors without adding an assistant message", async () => {
    useAppStore.setState({ apiKey: "k" });
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "You exceeded your current quota." }),
    })) as unknown as typeof fetch;

    await useAppStore.getState().sendMessage("hi");
    const s = useAppStore.getState();
    expect(s.error).toMatch(/quota/i);
    expect(s.messages.map((m) => m.role)).toEqual(["user"]);
    expect(s.isSending).toBe(false);
  });

  it("create_discrete_topic stages cards without a parent and previews an island patch", async () => {
    const root = makeNode(makeMap({ id: "root", title: "Root", type: "root" }));
    useAppStore.setState({ apiKey: "k", nodes: [root], workspaceTitle: "WS" });
    mockResponse(
      result({
        intent: "create_discrete_topic",
        relevanceToSelectedNode: 0.1,
        candidateCards: [
          { tempId: "t1", title: "Side topic", type: "topic", oneLineSummary: "s", confidence: 0.8 },
        ],
      })
    );
    await useAppStore.getState().sendMessage("unrelated question");
    const s = useAppStore.getState();
    expect(s.candidateCards).toHaveLength(1);
    expect(s.candidateCards[0].suggestedParentId).toBeUndefined();
    expect(s.pendingPatch?.intent).toBe("create_discrete_topic");
  });
});
