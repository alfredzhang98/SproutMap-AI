import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_TYPE_META, type MapNodeData } from "@/types/map";
import { TypeBadge } from "./TypeBadge";

export function MapNode({ data, selected }: NodeProps) {
  const map = (data as { map: MapNodeData }).map;
  const meta = NODE_TYPE_META[map.type];
  return (
    <div
      className="w-[210px] rounded-xl border bg-[var(--surface)] px-3 py-2 shadow-soft transition"
      style={{
        borderColor: selected ? "var(--primary-dark)" : "var(--border)",
        borderLeft: `3px solid ${meta.color}`,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center justify-between gap-1">
        <TypeBadge type={map.type} />
        {map.createdBy === "ai" && (
          <span
            title="Created by AI"
            className="text-[9px] text-[var(--text-muted)]"
          >
            AI
          </span>
        )}
      </div>
      <div className="mt-1 text-[13px] font-semibold leading-snug text-[var(--text-main)]">
        {map.title}
      </div>
      {map.oneLineSummary && (
        <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--text-muted)]">
          {map.oneLineSummary}
        </div>
      )}
      {map.isLocked && (
        <div className="mt-1 text-[9px] text-[var(--text-muted)]">🔒 locked</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
