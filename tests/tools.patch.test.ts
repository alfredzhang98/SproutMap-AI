import { describe, expect, it } from "vitest";
import {
  applyMapPatch,
  planMapPatchFromCards,
  type GraphState,
} from "@/lib/tools/patch";
import type { CandidateCard } from "@/types/map";
import type { MapPatch } from "@/types/agent";
import { newId, nowIso } from "@/lib/ids";
import { makeMap } from "./factories";

function card(p: Partial<CandidateCard> & { id: string }): CandidateCard {
  return {
    id: p.id,
    title: p.title ?? "Card",
    type: p.type ?? "concept",
    oneLineSummary: p.oneLineSummary ?? "s",
    detailSummary: p.detailSummary,
    suggestedParentId: p.suggestedParentId,
    suggestedParentTitle: p.suggestedParentTitle,
    suggestedRelation: p.suggestedRelation,
    confidence: p.confidence ?? 0.6,
    sourceMessageId: p.sourceMessageId ?? "m1",
    status: p.status ?? "pending",
  };
}

const ROOT = makeMap({ id: "root", title: "Root", type: "root", topicIslandId: "i1" });

describe("planMapPatchFromCards", () => {
  it("creates next_step ops chained for a flow", () => {
    const cards = [
      card({ id: "c1", type: "step", title: "Step 1" }),
      card({ id: "c2", type: "step", title: "Step 2" }),
      card({ id: "c3", type: "step", title: "Step 3" }),
    ];
    const patch = planMapPatchFromCards({
      cards,
      nodes: [ROOT],
      intent: "generate_steps",
      automationLevel: "auto_add_scoped",
      selectedNodeId: "root",
      summary: "flow",
    });
    expect(patch.operations).toHaveLength(3);
    expect(patch.operations.every((o) => o.payload.relation === "next_step")).toBe(
      true
    );
    // Step 2 chains onto Step 1's tempId.
    expect(patch.operations[1].payload.parentRef).toBe("t_c1");
  });

  it("uses option_of relation for options", () => {
    const patch = planMapPatchFromCards({
      cards: [card({ id: "c1", type: "method", title: "M1" })],
      nodes: [ROOT],
      intent: "generate_options",
      automationLevel: "auto_add_scoped",
      selectedNodeId: "root",
      summary: "opts",
    });
    expect(patch.operations[0].payload.relation).toBe("option_of");
  });

  it("creates a topic island for a discrete topic", () => {
    const patch = planMapPatchFromCards({
      cards: [
        card({ id: "c1", type: "topic", title: "Island root" }),
        card({ id: "c2", title: "Child" }),
      ],
      nodes: [ROOT],
      intent: "create_discrete_topic",
      automationLevel: "patch_preview",
      selectedNodeId: undefined,
      summary: "island",
    });
    expect(patch.operations[0].type).toBe("create_topic_island");
    expect(patch.operations[1].payload.parentRef).toBe("t_c1");
  });
});

function patchFrom(ops: MapPatch["operations"]): MapPatch {
  return {
    id: newId("patch"),
    summary: "",
    intent: "expand_selected_node",
    automationLevel: "auto_add_scoped",
    operations: ops,
    createdBy: "ai",
    status: "pending",
    createdAt: nowIso(),
  };
}

describe("applyMapPatch", () => {
  const start: GraphState = { nodes: [ROOT], edges: [] };

  it("creates a node and a parent edge, resolving the parent by id", () => {
    const patch = patchFrom([
      {
        id: "op1",
        type: "create_node",
        selected: true,
        payload: {
          tempId: "t1",
          title: "Child",
          type: "concept",
          oneLineSummary: "s",
          parentRef: "root",
          relation: "contains",
        },
      },
    ]);
    const out = applyMapPatch(start, patch);
    expect(out.nodes).toHaveLength(2);
    const child = out.nodes.find((n) => n.title === "Child")!;
    expect(child.parentId).toBe("root");
    expect(out.edges).toHaveLength(1);
    expect(out.edges[0].source).toBe("root");
    expect(out.edges[0].target).toBe(child.id);
  });

  it("skips operations that are deselected", () => {
    const patch = patchFrom([
      {
        id: "op1",
        type: "create_node",
        selected: false,
        payload: { tempId: "t1", title: "Nope", parentRef: "root" },
      },
    ]);
    const out = applyMapPatch(start, patch);
    expect(out.nodes).toHaveLength(1);
  });

  it("renames a node but never an existing locked node", () => {
    const locked = makeMap({ id: "lk", title: "Locked", isLocked: true });
    const patch = patchFrom([
      { id: "o", type: "rename_node", selected: true, payload: { nodeId: "lk", newTitle: "X" } },
    ]);
    const out = applyMapPatch({ nodes: [ROOT, locked], edges: [] }, patch);
    expect(out.nodes.find((n) => n.id === "lk")!.title).toBe("Locked");
  });

  it("merges nodes, re-pointing edges and dropping merged ids", () => {
    const a = makeMap({ id: "a", title: "A" });
    const b = makeMap({ id: "b", title: "B" });
    const c = makeMap({ id: "c", title: "C" });
    const graph: GraphState = {
      nodes: [a, b, c],
      edges: [
        { id: "e1", source: "a", target: "c", relation: "contains", createdBy: "ai" },
        { id: "e2", source: "b", target: "c", relation: "contains", createdBy: "ai" },
      ],
    };
    const patch = patchFrom([
      {
        id: "o",
        type: "merge_nodes",
        selected: true,
        payload: { nodeIds: ["a", "b"], newTitle: "AB" },
      },
    ]);
    const out = applyMapPatch(graph, patch);
    expect(out.nodes.map((n) => n.id).sort()).toEqual(["a", "c"]);
    expect(out.nodes.find((n) => n.id === "a")!.title).toBe("AB");
    // Both edges now originate from the kept node; self-loops removed.
    expect(out.edges.every((e) => e.source === "a" && e.target === "c")).toBe(true);
  });

  it("drops edges pointing at non-existent nodes", () => {
    const graph: GraphState = {
      nodes: [ROOT],
      edges: [{ id: "e", source: "root", target: "ghost", relation: "contains", createdBy: "ai" }],
    };
    const out = applyMapPatch(graph, patchFrom([]));
    expect(out.edges).toHaveLength(0);
  });
});
