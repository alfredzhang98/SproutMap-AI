import type { PreferredMapMode, UserIntent } from "@/types/agent";

/**
 * Deterministic, keyword-based intent pre-classifier. It runs instantly with no
 * LLM call and produces a hint that is (a) sent to the generate skill and
 * (b) used by the automation decision. The LLM returns the final intent.
 */

const OPTION_WORDS = [
  "有哪些",
  "几种",
  "方法",
  "方案",
  "路线",
  "选项",
  "approaches",
  "methods",
  "options",
  "types",
  "strategies",
  "ways",
];

const STEP_WORDS = [
  "如何",
  "怎么做",
  "流程",
  "步骤",
  "step by step",
  "step-by-step",
  "workflow",
  "pipeline",
  "process",
  "how to",
  "how do",
];

const COMPARE_WORDS = [
  "比较",
  "对比",
  "区别",
  "vs",
  "versus",
  "compare",
  "difference",
  "还是",
  "trade-off",
  "tradeoff",
  "哪个更好",
];

const REFACTOR_WORDS = [
  "整理",
  "重构",
  "归类",
  "清理",
  "重新组织",
  "reorganize",
  "refactor",
  "clean up",
  "cleanup",
  "tidy",
  "restructure",
];

const SUMMARIZE_WORDS = [
  "总结",
  "概括",
  "summarize",
  "summary",
  "recap",
  "overview of",
];

const EXPLICIT_BUILD_WORDS = [
  "生成",
  "帮我生成",
  "画",
  "做一个",
  "建一个",
  "mindmap",
  "mind map",
  "思维导图",
  "流程图",
  "整理成",
  "变成图",
  "generate",
  "build a map",
  "draw",
  "create a map",
  "turn this into",
];

const EXPAND_WORDS = [
  "展开",
  "深入",
  "具体",
  "细化",
  "这个下面",
  "继续",
  "expand",
  "drill down",
  "go deeper",
  "elaborate",
];

function hasAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

export type IntentHeuristic = {
  intent: UserIntent;
  preferredMapMode: PreferredMapMode;
  explicitMapCommand: boolean;
};

export function classifyIntentHeuristic(
  message: string,
  hasSelectedNode: boolean,
  hasMap: boolean
): IntentHeuristic {
  const text = message.toLowerCase();
  const explicitMapCommand = hasAny(text, EXPLICIT_BUILD_WORDS);

  let intent: UserIntent;
  let preferredMapMode: PreferredMapMode = "tree";

  if (!hasMap) {
    intent = "create_root";
  } else if (hasAny(text, REFACTOR_WORDS)) {
    intent = "refactor_map";
    preferredMapMode = "none";
  } else if (hasAny(text, SUMMARIZE_WORDS)) {
    intent = "summarize_branch";
    preferredMapMode = "none";
  } else if (hasAny(text, COMPARE_WORDS)) {
    intent = "compare_options";
    preferredMapMode = "matrix";
  } else if (hasAny(text, STEP_WORDS)) {
    intent = "generate_steps";
    preferredMapMode = "flow";
  } else if (hasAny(text, OPTION_WORDS)) {
    intent = "generate_options";
    preferredMapMode = "tree";
  } else if (hasSelectedNode && hasAny(text, EXPAND_WORDS)) {
    intent = "expand_selected_node";
  } else if (hasSelectedNode) {
    intent = "deep_dive_node";
  } else {
    intent = "general_answer";
    preferredMapMode = "none";
  }

  return { intent, preferredMapMode, explicitMapCommand };
}
