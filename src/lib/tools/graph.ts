import type { MapEdgeData, MapNodeData } from "@/types/map";

/**
 * Deterministic graph-query tools. These never call the LLM — they are the
 * cheap, reliable substrate the agent pipeline builds on.
 */

export function indexNodes(nodes: MapNodeData[]): Map<string, MapNodeData> {
  return new Map(nodes.map((n) => [n.id, n]));
}

/** Titles from root → node (inclusive), following parentId. Cycle-safe. */
export function getNodePath(nodeId: string, nodes: MapNodeData[]): MapNodeData[] {
  const map = indexNodes(nodes);
  const path: MapNodeData[] = [];
  const guard = new Set<string>();
  let current = map.get(nodeId);
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    path.unshift(current);
    current = current.parentId ? map.get(current.parentId) : undefined;
  }
  return path;
}

export function getChildren(nodeId: string, nodes: MapNodeData[]): MapNodeData[] {
  return nodes
    .filter((n) => n.parentId === nodeId)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

export function getSiblingNodes(nodeId: string, nodes: MapNodeData[]): MapNodeData[] {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return [];
  return nodes.filter((n) => n.parentId === node.parentId && n.id !== nodeId);
}

/** All descendants of nodeId (depth-first). Cycle-safe. */
export function getSubtree(nodeId: string, nodes: MapNodeData[]): MapNodeData[] {
  const out: MapNodeData[] = [];
  const guard = new Set<string>([nodeId]);
  const walk = (id: string) => {
    for (const child of getChildren(id, nodes)) {
      if (guard.has(child.id)) continue;
      guard.add(child.id);
      out.push(child);
      walk(child.id);
    }
  };
  walk(nodeId);
  return out;
}

export function getTopicIsland(nodeId: string, nodes: MapNodeData[]): MapNodeData[] {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return [];
  return nodes.filter((n) => n.topicIslandId === node.topicIslandId);
}

export function getRootNode(nodes: MapNodeData[]): MapNodeData | undefined {
  return nodes.find((n) => n.type === "root");
}

/** Groups of nodes that share a normalized title (potential duplicates). */
export function findDuplicateTitles(nodes: MapNodeData[]): MapNodeData[][] {
  const buckets = new Map<string, MapNodeData[]>();
  for (const n of nodes) {
    const key = n.title.trim().toLowerCase();
    if (!key) continue;
    const list = buckets.get(key) ?? [];
    list.push(n);
    buckets.set(key, list);
  }
  return [...buckets.values()].filter((g) => g.length > 1);
}

/** Nodes with no parent and no children — likely stranded. */
export function findOrphanNodes(
  nodes: MapNodeData[],
  edges: MapEdgeData[]
): MapNodeData[] {
  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  return nodes.filter(
    (n) => n.type !== "root" && !n.parentId && !connected.has(n.id)
  );
}

/**
 * A rough 0..1 score of how busy the map is, used by the automation decision
 * to be more conservative as the graph grows.
 */
export function graphComplexityScore(
  nodes: MapNodeData[],
  edges: MapEdgeData[]
): number {
  const islands = new Set(nodes.map((n) => n.topicIslandId)).size;
  const raw = nodes.length / 40 + edges.length / 60 + islands / 8;
  return Math.min(1, raw);
}

/** Resolve a title to an existing node id (case-insensitive). */
export function findNodeIdByTitle(
  title: string,
  nodes: MapNodeData[]
): string | undefined {
  const key = title.trim().toLowerCase();
  return nodes.find((n) => n.title.trim().toLowerCase() === key)?.id;
}
