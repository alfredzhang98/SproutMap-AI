import type { PreferredMapMode, UserIntent } from "@/types/agent";

export type { GenerateResult, RefactorResult } from "@/types/agent";

/** Deterministic intent hint passed from the client into the generate skill. */
export type IntentHeuristicHint = {
  intent: UserIntent;
  preferredMapMode: PreferredMapMode;
  explicitMapCommand: boolean;
};
