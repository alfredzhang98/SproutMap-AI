import type { ChatMessage, MapEdgeData, MapNodeData } from "@/types/map";

export type ContextMode =
  | "global"
  | "selected_node"
  | "selected_subtree"
  | "selected_island";

export type WorkspaceSnapshot = {
  workspaceTitle: string;
  nodes: MapNodeData[];
  edges: MapEdgeData[];
  messages: ChatMessage[];
};

export type ContextPayload = {
  workspaceTitle: string;
  contextMode: ContextMode;
  selectedPath: string[];
  selectedNode: {
    id: string;
    title: string;
    type: string;
    summary: string;
    detail?: string;
    notes?: string;
  } | null;
  childrenSummaries: { title: string; summary: string }[];
  siblingSummaries: { title: string; summary: string }[];
  subtreeSummaries?: { title: string; summary: string }[];
  islandSummaries?: { title: string; summary: string }[];
  globalMapIndex: { title: string; type: string }[];
  recentMessages: { role: string; content: string }[];
  userQuestion: string;
};

function byId(nodes: MapNodeData[]): Map<string, MapNodeData> {
  return new Map(nodes.map((n) => [n.id, n]));
}

/** Walk from the node up to its root via parentId, returning titles root → node. */
function ancestorPath(node: MapNodeData, map: Map<string, MapNodeData>): string[] {
  const path: string[] = [];
  let current: MapNodeData | undefined = node;
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    path.unshift(current.title);
    current = current.parentId ? map.get(current.parentId) : undefined;
  }
  return path;
}

function children(node: MapNodeData, nodes: MapNodeData[]): MapNodeData[] {
  return nodes.filter((n) => n.parentId === node.id);
}

function siblings(node: MapNodeData, nodes: MapNodeData[]): MapNodeData[] {
  return nodes.filter((n) => n.parentId === node.parentId && n.id !== node.id);
}

function collectSubtree(
  node: MapNodeData,
  nodes: MapNodeData[],
  acc: MapNodeData[] = [],
  guard = new Set<string>()
): MapNodeData[] {
  if (guard.has(node.id)) return acc;
  guard.add(node.id);
  for (const child of children(node, nodes)) {
    acc.push(child);
    collectSubtree(child, nodes, acc, guard);
  }
  return acc;
}

/**
 * Assemble a compact context payload for the LLM based on the selected node and
 * the current context mode. Avoids sending the entire chat history unless the
 * mode is "global".
 */
export function buildContextPayload(opts: {
  workspace: WorkspaceSnapshot;
  selectedNodeId?: string;
  contextMode: ContextMode;
  userQuestion: string;
}): ContextPayload {
  const { workspace, selectedNodeId, contextMode, userQuestion } = opts;
  const map = byId(workspace.nodes);
  const selected = selectedNodeId ? map.get(selectedNodeId) : undefined;

  const globalMapIndex = workspace.nodes
    .slice(0, 60)
    .map((n) => ({ title: n.title, type: n.type }));

  const summarize = (n: MapNodeData) => ({
    title: n.title,
    summary: n.oneLineSummary,
  });

  // Recent chat: global mode sends more; scoped modes send only the last few.
  const recentLimit = contextMode === "global" ? 16 : 6;
  const recentMessages = workspace.messages
    .slice(-recentLimit)
    .map((m) => ({ role: m.role, content: m.content }));

  if (!selected || contextMode === "global") {
    return {
      workspaceTitle: workspace.workspaceTitle,
      contextMode,
      selectedPath: selected ? ancestorPath(selected, map) : [],
      selectedNode: selected
        ? {
            id: selected.id,
            title: selected.title,
            type: selected.type,
            summary: selected.oneLineSummary,
            detail: selected.detailSummary,
            notes: selected.userNotes,
          }
        : null,
      childrenSummaries: [],
      siblingSummaries: [],
      globalMapIndex,
      recentMessages,
      userQuestion,
    };
  }

  const childList = children(selected, workspace.nodes);
  const siblingList = siblings(selected, workspace.nodes);

  const payload: ContextPayload = {
    workspaceTitle: workspace.workspaceTitle,
    contextMode,
    selectedPath: ancestorPath(selected, map),
    selectedNode: {
      id: selected.id,
      title: selected.title,
      type: selected.type,
      summary: selected.oneLineSummary,
      detail: selected.detailSummary,
      notes: selected.userNotes,
    },
    childrenSummaries: childList.map(summarize),
    siblingSummaries: siblingList.map(summarize),
    globalMapIndex,
    recentMessages,
    userQuestion,
  };

  if (contextMode === "selected_subtree") {
    payload.subtreeSummaries = collectSubtree(selected, workspace.nodes).map(
      summarize
    );
  }

  if (contextMode === "selected_island") {
    payload.islandSummaries = workspace.nodes
      .filter(
        (n) => n.topicIslandId === selected.topicIslandId && n.id !== selected.id
      )
      .map(summarize);
  }

  return payload;
}
