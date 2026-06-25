import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MapNodeData } from "@/types/map";

export function RootNode({ data, selected, targetPosition, sourcePosition }: NodeProps) {
  const map = (data as { map: MapNodeData }).map;
  const target = targetPosition ?? Position.Top;
  const source = sourcePosition ?? Position.Bottom;
  return (
    <div
      className="w-[216px] rounded-2xl border-2 px-3.5 py-3 shadow-soft transition"
      style={{
        background: "linear-gradient(180deg, var(--primary-light), #eaf7ec)",
        borderColor: selected ? "var(--primary-dark)" : "var(--primary)",
        boxShadow: selected
          ? "0 0 0 2px var(--accent), 0 6px 18px rgba(27,31,29,0.07)"
          : undefined,
      }}
    >
      <Handle type="target" position={target} />
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
        ◉ Root
      </div>
      <div className="mt-1 text-sm font-bold leading-snug text-[var(--text-main)]">
        {map.title}
      </div>
      {map.oneLineSummary && (
        <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--primary-dark)]">
          {map.oneLineSummary}
        </div>
      )}
      <Handle type="source" position={source} />
    </div>
  );
}
