import { describe, expect, it } from "vitest";
import { decideAutomationLevel } from "@/lib/tools/automation";
import type { AutomationDecisionInput } from "@/types/agent";

function base(overrides: Partial<AutomationDecisionInput> = {}): AutomationDecisionInput {
  return {
    intent: "expand_selected_node",
    userExplicitCommand: false,
    selectedNodeId: "n1",
    relationConfidence: 0.7,
    relevanceToSelectedNode: 0.7,
    proposedNodeCount: 4,
    proposedMaxDepth: 1,
    modifiesExistingStructure: false,
    createsCrossTopicEdges: false,
    createsNewTopicIsland: false,
    graphComplexityScore: 0.2,
    userAutomationPreference: "balanced",
    ...overrides,
  };
}

describe("decideAutomationLevel", () => {
  it("manual mode always stages candidate cards", () => {
    const d = decideAutomationLevel(base({ userAutomationPreference: "manual", userExplicitCommand: true }));
    expect(d.level).toBe("candidate_only");
  });

  it("general questions stay as candidate cards", () => {
    const d = decideAutomationLevel(base({ intent: "general_answer", userExplicitCommand: false }));
    expect(d.level).toBe("candidate_only");
  });

  it("refactor and structure-modifying changes require patch preview", () => {
    expect(decideAutomationLevel(base({ intent: "refactor_map" })).level).toBe(
      "patch_preview"
    );
    expect(
      decideAutomationLevel(base({ modifiesExistingStructure: true })).level
    ).toBe("patch_preview");
    expect(
      decideAutomationLevel(base({ createsCrossTopicEdges: true })).level
    ).toBe("patch_preview");
  });

  it("large proposals require patch preview", () => {
    expect(decideAutomationLevel(base({ proposedNodeCount: 9 })).level).toBe(
      "patch_preview"
    );
    expect(decideAutomationLevel(base({ proposedMaxDepth: 3 })).level).toBe(
      "patch_preview"
    );
  });

  it("explicit + clear scope + high confidence → scoped auto-add", () => {
    const d = decideAutomationLevel(
      base({
        intent: "generate_steps",
        userExplicitCommand: true,
        relationConfidence: 0.9,
        relevanceToSelectedNode: 0.9,
      })
    );
    expect(d.level).toBe("auto_add_scoped");
    expect(d.allowUndo).toBe(true);
    expect(d.requiresUserConfirmation).toBe(false);
  });

  it("auto-assist mode drafts a fresh map from a broad request", () => {
    const d = decideAutomationLevel(
      base({
        intent: "create_root",
        selectedNodeId: undefined,
        userAutomationPreference: "auto_assist",
        proposedNodeCount: 5,
      })
    );
    expect(d.level).toBe("full_auto_draft");
  });

  it("medium-confidence relevant proposals show ghost preview", () => {
    const d = decideAutomationLevel(
      base({ relationConfidence: 0.7, relevanceToSelectedNode: 0.7, userExplicitCommand: false })
    );
    expect(d.level).toBe("ghost_preview");
  });

  it("uncertain placement falls back to candidate tray", () => {
    const d = decideAutomationLevel(
      base({
        selectedNodeId: undefined,
        relationConfidence: 0.3,
        relevanceToSelectedNode: 0.3,
      })
    );
    expect(d.level).toBe("candidate_only");
  });
});
