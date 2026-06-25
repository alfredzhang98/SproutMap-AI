import { describe, expect, it } from "vitest";
import { autoLayout } from "@/lib/layout";
import { makeEdge, makeMap, makeNode } from "./factories";

describe("autoLayout", () => {
  it("returns an empty array for no nodes", () => {
    expect(autoLayout([], [])).toEqual([]);
  });

  it("assigns finite numeric positions to every node", () => {
    const root = makeNode(makeMap({ id: "r", title: "R", type: "root", topicIslandId: "i1" }));
    const c1 = makeNode(makeMap({ id: "c1", title: "C1", parentId: "r", topicIslandId: "i1" }));
    const c2 = makeNode(makeMap({ id: "c2", title: "C2", parentId: "r", topicIslandId: "i1" }));
    const edges = [makeEdge("r", "c1"), makeEdge("r", "c2")];
    const laid = autoLayout([root, c1, c2], edges);
    expect(laid).toHaveLength(3);
    for (const node of laid) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
  });

  it("separates topic islands horizontally so they do not overlap", () => {
    const i1a = makeNode(makeMap({ id: "i1a", title: "I1A", topicIslandId: "i1" }));
    const i1b = makeNode(makeMap({ id: "i1b", title: "I1B", parentId: "i1a", topicIslandId: "i1" }));
    const i2a = makeNode(makeMap({ id: "i2a", title: "I2A", topicIslandId: "i2" }));
    const i2b = makeNode(makeMap({ id: "i2b", title: "I2B", parentId: "i2a", topicIslandId: "i2" }));
    const edges = [makeEdge("i1a", "i1b"), makeEdge("i2a", "i2b")];
    const laid = autoLayout([i1a, i1b, i2a, i2b], edges);
    const byId = new Map(laid.map((nd) => [nd.id, nd]));
    const island1MaxX = Math.max(byId.get("i1a")!.position.x, byId.get("i1b")!.position.x);
    const island2MinX = Math.min(byId.get("i2a")!.position.x, byId.get("i2b")!.position.x);
    expect(island2MinX).toBeGreaterThan(island1MaxX);
  });

  it("preserves node identity and data through layout", () => {
    const a = makeNode(makeMap({ id: "a", title: "A" }));
    const laid = autoLayout([a], []);
    expect(laid[0].id).toBe("a");
    expect(laid[0].data.map.title).toBe("A");
  });
});
