import { describe, expect, it } from "vitest";
import {
  extractPartialAnswer,
  normalizeGenerateResult,
  safeParseModelJson,
} from "@/lib/skills/generate";
import type { IntentHeuristicHint } from "@/lib/skills/types";

const hint: IntentHeuristicHint = {
  intent: "create_root",
  preferredMapMode: "tree",
  explicitMapCommand: false,
};

describe("safeParseModelJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseModelJson('{"answer":"hi"}')?.answer).toBe("hi");
  });
  it("recovers JSON wrapped in code fences", () => {
    expect(safeParseModelJson('```json\n{"answer":"x"}\n```')?.answer).toBe("x");
  });
  it("recovers JSON with leading prose (stray thoughts)", () => {
    expect(
      safeParseModelJson('Thinking about it...\n{"answer":"y","intent":"general_answer"}')?.answer
    ).toBe("y");
  });
  it("returns null when there is no object", () => {
    expect(safeParseModelJson("not json at all")).toBeNull();
  });
});

describe("extractPartialAnswer", () => {
  it("reads the answer field mid-stream before it closes", () => {
    expect(extractPartialAnswer('{"answer":"Hello, wor')).toBe("Hello, wor");
  });
  it("unescapes newlines and quotes", () => {
    expect(extractPartialAnswer('{"answer":"a\\nb \\"c\\""')).toBe('a\nb "c"');
  });
  it("returns empty before the answer field appears", () => {
    expect(extractPartialAnswer('{"int')).toBe("");
  });
});

describe("normalizeGenerateResult", () => {
  it("clamps cards to 7 and fills defaults", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      tempId: `t${i}`,
      title: `C${i}`,
      type: "concept" as const,
      oneLineSummary: "s",
      confidence: 0.5,
    }));
    const res = normalizeGenerateResult({ answer: "a", candidateCards: many }, hint);
    expect(res.candidateCards).toHaveLength(7);
    expect(res.intent).toBe("create_root"); // from hint fallback
  });
});
