import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MapNodeData } from "@/types/map";

export function RootNode({ data, selected }: NodeProps) {
  const map = (data as { map: MapNodeData }).map;
  return (
    <div
      className="w-[210px] rounded-xl border-2 px-3 py-2 shadow-soft transition"
      style={{
        background: "var(--primary-light)",
        borderColor: selected ? "var(--primary-dark)" : "var(--primary)",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
        ◉ Root
      </div>
      <div className="mt-1 text-sm font-semibold leading-snug text-[var(--text-main)]">
        {map.title}
      </div>
      {map.oneLineSummary && (
        <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--text-muted)]">
          {map.oneLineSummary}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
