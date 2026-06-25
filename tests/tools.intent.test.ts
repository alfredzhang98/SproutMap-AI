import { describe, expect, it } from "vitest";
import { classifyIntentHeuristic } from "@/lib/tools/intent";

describe("classifyIntentHeuristic", () => {
  it("returns create_root when there is no map yet", () => {
    expect(classifyIntentHeuristic("anything", false, false).intent).toBe(
      "create_root"
    );
  });

  it("detects options questions", () => {
    const r = classifyIntentHeuristic("有哪些商业化方法？", false, true);
    expect(r.intent).toBe("generate_options");
  });

  it("detects step/workflow questions and prefers flow mode", () => {
    const r = classifyIntentHeuristic("如何一步步构建分镜流程？", false, true);
    expect(r.intent).toBe("generate_steps");
    expect(r.preferredMapMode).toBe("flow");
  });

  it("detects compare questions", () => {
    const r = classifyIntentHeuristic("A 和 B 有什么区别？", false, true);
    expect(r.intent).toBe("compare_options");
    expect(r.preferredMapMode).toBe("matrix");
  });

  it("detects refactor requests", () => {
    const r = classifyIntentHeuristic("帮我整理当前图", false, true);
    expect(r.intent).toBe("refactor_map");
  });

  it("expands the selected node when asked to go deeper", () => {
    const r = classifyIntentHeuristic("这个展开一下", true, true);
    expect(r.intent).toBe("expand_selected_node");
  });

  it("flags explicit map-building commands", () => {
    expect(classifyIntentHeuristic("帮我生成一个思维导图", false, true).explicitMapCommand).toBe(
      true
    );
    expect(classifyIntentHeuristic("这个词什么意思", false, true).explicitMapCommand).toBe(
      false
    );
  });

  it("falls back to general_answer with no selection", () => {
    const r = classifyIntentHeuristic("这个词什么意思", false, true);
    expect(r.intent).toBe("general_answer");
  });
});
