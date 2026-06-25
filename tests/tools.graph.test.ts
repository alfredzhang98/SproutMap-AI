import { describe, expect, it } from "vitest";
import {
  findDuplicateTitles,
  getChildren,
  getNodePath,
  getSiblingNodes,
  getSubtree,
  getTopicIsland,
  graphComplexityScore,
} from "@/lib/tools/graph";
import { makeMap } from "./factories";

function tree() {
  return [
    makeMap({ id: "root", title: "Root", type: "root", topicIslandId: "i1" }),
    makeMap({ id: "a", title: "A", parentId: "root", topicIslandId: "i1", orderIndex: 0 }),
    makeMap({ id: "b", title: "B", parentId: "root", topicIslandId: "i1", orderIndex: 1 }),
    makeMap({ id: "a1", title: "A1", parentId: "a", topicIslandId: "i1" }),
    makeMap({ id: "a2", title: "A2", parentId: "a", topicIslandId: "i1" }),
    makeMap({ id: "x", title: "A", topicIslandId: "i2" }),
  ];
}

describe("graph tools", () => {
  it("getNodePath returns root → node", () => {
    expect(getNodePath("a1", tree()).map((n) => n.title)).toEqual([
      "Root",
      "A",
      "A1",
    ]);
  });

  it("getChildren respects orderIndex", () => {
    expect(getChildren("root", tree()).map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("getSiblingNodes excludes the node itself", () => {
    expect(getSiblingNodes("a", tree()).map((n) => n.id)).toEqual(["b"]);
  });

  it("getSubtree returns all descendants", () => {
    expect(getSubtree("a", tree()).map((n) => n.id).sort()).toEqual(["a1", "a2"]);
  });

  it("getTopicIsland groups by island id", () => {
    expect(getTopicIsland("x", tree()).map((n) => n.id)).toEqual(["x"]);
  });

  it("findDuplicateTitles flags same-title nodes", () => {
    const dupes = findDuplicateTitles(tree());
    expect(dupes).toHaveLength(1);
    expect(dupes[0].map((n) => n.id).sort()).toEqual(["a", "x"]);
  });

  it("graphComplexityScore stays within 0..1", () => {
    const score = graphComplexityScore(tree(), []);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
