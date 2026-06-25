"use client";

import { useCallback, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAppStore } from "@/store/useAppStore";
import { NODE_TYPE_META } from "@/types/map";
import { RootNode } from "./nodes/RootNode";
import { MapNode } from "./nodes/MapNode";
import { GhostNode } from "./nodes/GhostNode";
import { CARD_DND_MIME } from "@/lib/dnd";

const nodeTypes = {
  root: RootNode,
  map: MapNode,
  ghost: GhostNode,
};

const GHOST_CONFIDENCE = 0.75;

function findTargetId(
  clientX: number,
  clientY: number,
  selector: string
): string | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    const match = (el as HTMLElement).closest(selector);
    if (match) {
      const id =
        match.getAttribute("data-id") ||
        match.getAttribute("data-testid")?.replace(/^rf__edge-/, "") ||
        null;
      if (id) return id;
    }
  }
  return null;
}

function CanvasInner() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const candidateCards = useAppStore((s) => s.candidateCards);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const selectedEdgeId = useAppStore((s) => s.selectedEdgeId);
  const onNodesChange = useAppStore((s) => s.onNodesChange);
  const onEdgesChange = useAppStore((s) => s.onEdgesChange);
  const onConnect = useAppStore((s) => s.onConnect);
  const setSelectedNode = useAppStore((s) => s.setSelectedNode);
  const setSelectedEdge = useAppStore((s) => s.setSelectedEdge);
  const addCandidateToNode = useAppStore((s) => s.addCandidateToNode);
  const addCandidateAsIsland = useAppStore((s) => s.addCandidateAsIsland);
  const insertCandidateOnEdge = useAppStore((s) => s.insertCandidateOnEdge);

  const { screenToFlowPosition } = useReactFlow();

  // Derive ghost preview nodes from high-confidence pending cards.
  const ghostNodes = useMemo<Node[]>(() => {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const perParent = new Map<string, number>();
    const ghosts: Node[] = [];
    for (const card of candidateCards) {
      if (card.status !== "pending") continue;
      if (card.confidence < GHOST_CONFIDENCE) continue;
      if (!card.suggestedParentId) continue;
      const parent = nodeById.get(card.suggestedParentId);
      if (!parent) continue;
      const index = perParent.get(parent.id) ?? 0;
      perParent.set(parent.id, index + 1);
      ghosts.push({
        id: `ghost_${card.id}`,
        type: "ghost",
        position: {
          x: parent.position.x + 250,
          y: parent.position.y + index * 110,
        },
        data: { card },
        draggable: false,
        selectable: false,
      });
    }
    return ghosts;
  }, [candidateCards, nodes]);

  const renderedNodes = useMemo<Node[]>(() => {
    const base: Node[] = nodes.map((n) => ({
      ...n,
      selected: n.id === selectedNodeId,
    }));
    return [...base, ...ghostNodes];
  }, [nodes, ghostNodes, selectedNodeId]);

  const renderedEdges = useMemo(
    () => edges.map((e) => ({ ...e, selected: e.id === selectedEdgeId })),
    [edges, selectedEdgeId]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const cardId = event.dataTransfer.getData(CARD_DND_MIME);
      if (!cardId) return;

      const nodeId = findTargetId(
        event.clientX,
        event.clientY,
        ".react-flow__node"
      );
      if (nodeId && !nodeId.startsWith("ghost_")) {
        addCandidateToNode(cardId, nodeId);
        return;
      }

      const edgeId = findTargetId(
        event.clientX,
        event.clientY,
        ".react-flow__edge"
      );
      if (edgeId) {
        insertCandidateOnEdge(cardId, edgeId);
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addCandidateAsIsland(cardId, position);
    },
    [
      addCandidateToNode,
      insertCandidateOnEdge,
      addCandidateAsIsland,
      screenToFlowPosition,
    ]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div className="h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={renderedNodes}
        edges={renderedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          if (!node.id.startsWith("ghost_")) setSelectedNode(node.id);
        }}
        onEdgeClick={(_, edge) => setSelectedEdge(edge.id)}
        onPaneClick={() => {
          setSelectedNode(undefined);
          setSelectedEdge(undefined);
        }}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d3e7d6" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const type = (n.data as { map?: { type?: keyof typeof NODE_TYPE_META } })?.map
              ?.type;
            return type ? NODE_TYPE_META[type].color : "#74c69d";
          }}
          maskColor="rgba(238, 248, 239, 0.6)"
          style={{ background: "var(--surface)" }}
        />
      </ReactFlow>
    </div>
  );
}

export function MapCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
