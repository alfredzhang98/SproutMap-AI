import type { AppEdge, AppNode } from "@/store/useAppStore";
import type { MapEdgeData, MapNodeData, NodeType } from "@/types/map";

let n = 0;

export function makeMap(partial: Partial<MapNodeData> & { title: string }): MapNodeData {
  n += 1;
  return {
    id: partial.id ?? `node_${n}`,
    title: partial.title,
    type: (partial.type ?? "concept") as NodeType,
    oneLineSummary: partial.oneLineSummary ?? `summary ${partial.title}`,
    detailSummary: partial.detailSummary,
    userNotes: partial.userNotes,
    sourceMessageIds: partial.sourceMessageIds ?? [],
    parentId: partial.parentId,
    topicIslandId: partial.topicIslandId ?? "island_a",
    orderIndex: partial.orderIndex,
    tags: partial.tags ?? [],
    createdBy: partial.createdBy ?? "ai",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
    isLocked: partial.isLocked,
  };
}

export function makeNode(map: MapNodeData, x = 0, y = 0): AppNode {
  return {
    id: map.id,
    type: map.type === "root" ? "root" : "map",
    position: { x, y },
    data: { map },
  };
}

export function makeEdge(
  source: string,
  target: string,
  partial: Partial<MapEdgeData> = {}
): AppEdge {
  const map: MapEdgeData = {
    id: partial.id ?? `edge_${source}_${target}`,
    source,
    target,
    relation: partial.relation ?? "contains",
    label: partial.label,
    confidence: partial.confidence,
    createdBy: partial.createdBy ?? "ai",
    isSuggested: partial.isSuggested,
  };
  return {
    id: map.id,
    source,
    target,
    data: { map },
  };
}
