"use client";

import { useAppStore } from "@/store/useAppStore";
import { NodeInspector } from "./NodeInspector";
import { EdgeInspector } from "./EdgeInspector";

export function Inspector() {
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const selectedEdgeId = useAppStore((s) => s.selectedEdgeId);
  const node = useAppStore((s) =>
    s.nodes.find((n) => n.id === selectedNodeId)
  );
  const edge = useAppStore((s) =>
    s.edges.find((e) => e.id === selectedEdgeId)
  );

  return (
    <div className="h-full overflow-y-auto">
      {node ? (
        <NodeInspector node={node} />
      ) : edge ? (
        <EdgeInspector edge={edge} />
      ) : (
        <div className="p-4 text-sm text-[var(--text-muted)]">
          <div className="mb-1 font-semibold text-[var(--text-main)]">
            Inspector
          </div>
          Select a node or edge on the canvas to view and edit its details.
        </div>
      )}
    </div>
  );
}
