import Dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { MapEdgeData, MapNodeData } from "@/types/map";

export const NODE_WIDTH = 210;
export const NODE_HEIGHT = 84;

type AppNode = Node<{ map: MapNodeData }>;
type AppEdge = Edge<{ map: MapEdgeData }>;

/**
 * Auto-layout the map. Each topic island is laid out independently with dagre,
 * then islands are placed side by side so they never overlap. Islands whose
 * edges are mostly `next_step` are laid out left-to-right (flow); the rest are
 * laid out top-to-bottom (hierarchy).
 */
export function autoLayout(nodes: AppNode[], edges: AppEdge[]): AppNode[] {
  if (nodes.length === 0) return nodes;

  // Group nodes by island.
  const islands = new Map<string, AppNode[]>();
  for (const node of nodes) {
    const island = node.data.map.topicIslandId || "default";
    const list = islands.get(island) ?? [];
    list.push(node);
    islands.set(island, list);
  }

  const positioned: AppNode[] = [];
  let offsetX = 0;
  const ISLAND_GAP = 140;

  for (const [islandId, islandNodes] of islands) {
    const nodeIds = new Set(islandNodes.map((n) => n.id));
    const islandEdges = edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    const flowEdges = islandEdges.filter(
      (e) => e.data?.map.relation === "next_step"
    ).length;
    const direction =
      flowEdges > 0 && flowEdges >= islandEdges.length / 2 ? "LR" : "TB";

    const g = new Dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: direction,
      nodesep: 40,
      ranksep: 70,
      marginx: 20,
      marginy: 20,
    });

    for (const node of islandNodes) {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    for (const edge of islandEdges) {
      g.setEdge(edge.source, edge.target);
    }

    Dagre.layout(g);

    let minX = Infinity;
    let maxX = -Infinity;
    const laid = islandNodes.map((node) => {
      const pos = g.node(node.id);
      const x = (pos?.x ?? 0) - NODE_WIDTH / 2;
      const y = (pos?.y ?? 0) - NODE_HEIGHT / 2;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + NODE_WIDTH);
      return { node, x, y };
    });

    if (!isFinite(minX)) minX = 0;
    if (!isFinite(maxX)) maxX = NODE_WIDTH;

    for (const { node, x, y } of laid) {
      positioned.push({
        ...node,
        position: { x: x - minX + offsetX, y },
      });
    }

    offsetX += maxX - minX + ISLAND_GAP;
    void islandId;
  }

  return positioned;
}
