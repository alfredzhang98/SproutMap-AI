import type {
  AutomationDecision,
  AutomationDecisionInput,
} from "@/types/agent";

/**
 * The automation-control layer (PRD §17). Chooses how far the AI is allowed to
 * act on the map for this turn — from "answer only" up to "draft a whole map" —
 * balancing user intent, confidence, scope, and the user's automation mode.
 *
 * Core rule: automate near the user's intent and when reversible; require
 * confirmation whenever long-term structure or existing content is affected.
 */
export function decideAutomationLevel(
  input: AutomationDecisionInput
): AutomationDecision {
  const {
    intent,
    userExplicitCommand,
    selectedNodeId,
    relationConfidence,
    relevanceToSelectedNode,
    proposedNodeCount,
    proposedMaxDepth,
    modifiesExistingStructure,
    createsCrossTopicEdges,
    createsNewTopicIsland,
    userAutomationPreference,
  } = input;

  // Manual mode: the AI only ever stages candidate cards.
  if (userAutomationPreference === "manual") {
    return {
      level: "candidate_only",
      reason: "Manual mode — AI stages candidate cards; you place them.",
      requiresUserConfirmation: true,
      allowUndo: false,
    };
  }

  // Pure conversation with no map intent → cards only.
  if (intent === "general_answer" && !userExplicitCommand) {
    return {
      level: "candidate_only",
      reason: "General question without an explicit map request.",
      requiresUserConfirmation: true,
      allowUndo: false,
    };
  }

  if (intent === "summarize_branch") {
    return {
      level: "candidate_only",
      reason: "Summaries update node memory rather than adding nodes.",
      requiresUserConfirmation: false,
      allowUndo: false,
    };
  }

  // Anything that rewrites existing structure or links across topics → preview.
  if (
    intent === "refactor_map" ||
    modifiesExistingStructure ||
    createsCrossTopicEdges
  ) {
    return {
      level: "patch_preview",
      reason: "Modifies existing structure or links across topics.",
      requiresUserConfirmation: true,
      allowUndo: true,
    };
  }

  // Large/deep proposals are too big to drop in automatically.
  if (proposedNodeCount > 7 || proposedMaxDepth > 2) {
    return {
      level: "patch_preview",
      reason: "Proposed structure is large; review before inserting.",
      requiresUserConfirmation: true,
      allowUndo: true,
    };
  }

  // Auto-assist mode is allowed to draft a fresh map from a broad request.
  if (
    userAutomationPreference === "auto_assist" &&
    (intent === "create_root" || userExplicitCommand) &&
    proposedNodeCount <= 7
  ) {
    return {
      level: "full_auto_draft",
      reason: "Auto-assist drafts a starter map you can refine.",
      requiresUserConfirmation: false,
      allowUndo: true,
    };
  }

  // Explicit request, clear scope, high confidence → scoped auto-add.
  // Cap auto-add at 5 nodes (PRD §17.9); larger goes to patch preview above.
  if (
    userExplicitCommand &&
    selectedNodeId &&
    relationConfidence >= 0.8 &&
    relevanceToSelectedNode >= 0.8 &&
    proposedNodeCount <= 5 &&
    !createsCrossTopicEdges
  ) {
    return {
      level: "auto_add_scoped",
      reason: "Explicit request within a clear, confident scope.",
      requiresUserConfirmation: false,
      allowUndo: true,
    };
  }

  // A brand-new discrete island is reversible and spatially separate.
  if (createsNewTopicIsland && relevanceToSelectedNode < 0.5) {
    return {
      level: "patch_preview",
      reason: "Unrelated question — proposing a separate topic island.",
      requiresUserConfirmation: true,
      allowUndo: true,
    };
  }

  // Likely-relevant with a selected node → show ghosts for visual confirmation.
  if (
    selectedNodeId &&
    relationConfidence >= 0.65 &&
    relevanceToSelectedNode >= 0.65
  ) {
    return {
      level: "ghost_preview",
      reason: "Likely relevant — preview as ghost nodes to confirm.",
      requiresUserConfirmation: true,
      allowUndo: true,
    };
  }

  // Otherwise keep it safe in the candidate tray.
  return {
    level: "candidate_only",
    reason: "Placement is uncertain — kept in the candidate tray.",
    requiresUserConfirmation: true,
    allowUndo: false,
  };
}
