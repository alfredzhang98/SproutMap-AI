import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_TYPE_META, type MapNodeData } from "@/types/map";
import { useAppStore } from "@/store/useAppStore";
import { TypeBadge } from "./TypeBadge";

export function MapNode({ data, selected, targetPosition, sourcePosition }: NodeProps) {
  const map = (data as { map: MapNodeData }).map;
  const meta = NODE_TYPE_META[map.type];
  const target = targetPosition ?? Position.Top;
  const source = sourcePosition ?? Position.Bottom;
  const childCount = useAppStore(
    (s) => s.nodes.filter((n) => n.data.map.parentId === map.id).length
  );
  const toggleCollapse = useAppStore((s) => s.toggleCollapse);
  return (
    <div
      className="relative w-[216px] rounded-2xl border bg-[var(--surface)] px-3.5 py-2.5 shadow-soft transition"
      style={{
        borderColor: selected ? "var(--primary-dark)" : "var(--border)",
        boxShadow: selected
          ? "0 0 0 2px var(--primary-light), 0 6px 18px rgba(27,31,29,0.06)"
          : undefined,
        borderLeft: `3px solid ${meta.color}`,
      }}
    >
      <Handle type="target" position={target} />
      <div className="flex items-center justify-between gap-1">
        <TypeBadge type={map.type} />
        {map.createdBy === "ai" && (
          <span title="Created by AI" className="text-[9px] text-[var(--text-muted)]">
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
      {childCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapse(map.id);
          }}
          title={map.collapsed ? "Expand subtree" : "Collapse subtree"}
          className="absolute -bottom-2.5 left-1/2 z-10 flex h-5 -translate-x-1/2 items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-1.5 text-[9px] text-[var(--text-muted)] shadow-sm hover:bg-[var(--surface-soft)]"
        >
          {map.collapsed ? `▸ ${childCount}` : "▾"}
        </button>
      )}
      <Handle type="source" position={source} />
    </div>
  );
}
