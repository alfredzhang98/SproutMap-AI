import { describe, expect, it } from "vitest";
import { buildContextPayload, type WorkspaceSnapshot } from "@/lib/context";
import type { ChatMessage } from "@/types/map";
import { makeMap } from "./factories";

function tree(): WorkspaceSnapshot {
  const root = makeMap({ id: "root", title: "Root", type: "root" });
  const a = makeMap({ id: "a", title: "A", parentId: "root" });
  const b = makeMap({ id: "b", title: "B", parentId: "root" });
  const a1 = makeMap({ id: "a1", title: "A1", parentId: "a" });
  const a2 = makeMap({ id: "a2", title: "A2", parentId: "a" });
  const a1x = makeMap({ id: "a1x", title: "A1X", parentId: "a1" });
  return {
    workspaceTitle: "WS",
    nodes: [root, a, b, a1, a2, a1x],
    edges: [],
    messages: [],
  };
}

function messages(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    role: i % 2 === 0 ? "user" : "assistant",
    content: `message ${i}`,
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
}

describe("buildContextPayload", () => {
  it("global mode returns no children/siblings but includes selected node + map index", () => {
    const ws = tree();
    const payload = buildContextPayload({
      workspace: ws,
      selectedNodeId: "a",
      contextMode: "global",
      userQuestion: "q",
    });
    expect(payload.contextMode).toBe("global");
    expect(payload.selectedNode?.id).toBe("a");
    expect(payload.childrenSummaries).toEqual([]);
    expect(payload.siblingSummaries).toEqual([]);
    expect(payload.globalMapIndex.length).toBe(6);
    expect(payload.userQuestion).toBe("q");
  });

  it("selected_node mode includes ancestor path, children and siblings", () => {
    const ws = tree();
    const payload = buildContextPayload({
      workspace: ws,
      selectedNodeId: "a",
      contextMode: "selected_node",
      userQuestion: "q",
    });
    expect(payload.selectedPath).toEqual(["Root", "A"]);
    expect(payload.childrenSummaries.map((c) => c.title).sort()).toEqual([
      "A1",
      "A2",
    ]);
    expect(payload.siblingSummaries.map((c) => c.title)).toEqual(["B"]);
    expect(payload.subtreeSummaries).toBeUndefined();
  });

  it("selected_subtree mode adds the full subtree summaries", () => {
    const ws = tree();
    const payload = buildContextPayload({
      workspace: ws,
      selectedNodeId: "a",
      contextMode: "selected_subtree",
      userQuestion: "q",
    });
    expect(payload.subtreeSummaries?.map((s) => s.title).sort()).toEqual([
      "A1",
      "A1X",
      "A2",
    ]);
  });

  it("falls back to root-less payload when no node is selected", () => {
    const ws = tree();
    const payload = buildContextPayload({
      workspace: ws,
      selectedNodeId: undefined,
      contextMode: "selected_node",
      userQuestion: "q",
    });
    expect(payload.selectedNode).toBeNull();
    expect(payload.selectedPath).toEqual([]);
  });

  it("limits recent messages: 16 for global, 6 for scoped", () => {
    const ws = { ...tree(), messages: messages(20) };
    const global = buildContextPayload({
      workspace: ws,
      selectedNodeId: "a",
      contextMode: "global",
      userQuestion: "q",
    });
    const scoped = buildContextPayload({
      workspace: ws,
      selectedNodeId: "a",
      contextMode: "selected_node",
      userQuestion: "q",
    });
    expect(global.recentMessages.length).toBe(16);
    expect(scoped.recentMessages.length).toBe(6);
    // Most recent messages are kept.
    expect(scoped.recentMessages.at(-1)?.content).toBe("message 19");
  });

  it("does not infinite-loop on a cyclic parent reference", () => {
    const x = makeMap({ id: "x", title: "X", parentId: "y" });
    const y = makeMap({ id: "y", title: "Y", parentId: "x" });
    const ws: WorkspaceSnapshot = {
      workspaceTitle: "WS",
      nodes: [x, y],
      edges: [],
      messages: [],
    };
    const payload = buildContextPayload({
      workspace: ws,
      selectedNodeId: "x",
      contextMode: "selected_node",
      userQuestion: "q",
    });
    expect(payload.selectedPath.length).toBeLessThanOrEqual(2);
  });
});
