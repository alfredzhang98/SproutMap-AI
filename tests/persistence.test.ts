import { describe, expect, it } from "vitest";
import { parseWorkspaceJson } from "@/lib/persistence";

describe("parseWorkspaceJson", () => {
  it("parses a valid workspace and normalizes the version", () => {
    const input = JSON.stringify({
      version: 7,
      id: "ws_1",
      workspaceTitle: "T",
      nodes: [],
      edges: [],
      messages: [],
      candidateCards: [],
      model: "gemini-3-flash-preview",
      contextMode: "global",
      createdAt: "2026-01-01T00:00:00.000Z",
      savedAt: "2026-01-01T00:00:00.000Z",
    });
    const parsed = parseWorkspaceJson(input);
    expect(parsed).not.toBeNull();
    expect(parsed?.version).toBe(2);
    expect(parsed?.workspaceTitle).toBe("T");
  });

  it("returns null for invalid JSON", () => {
    expect(parseWorkspaceJson("{not json")).toBeNull();
  });

  it("returns null when nodes is missing or not an array", () => {
    expect(parseWorkspaceJson(JSON.stringify({ workspaceTitle: "x" }))).toBeNull();
    expect(parseWorkspaceJson(JSON.stringify({ nodes: "nope" }))).toBeNull();
  });
});
