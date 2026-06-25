import { NODE_TYPE_META, type NodeType } from "@/types/map";

export function TypeBadge({ type }: { type: NodeType }) {
  const meta = NODE_TYPE_META[type];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[1px] text-[10px] font-medium"
      style={{ color: meta.color, background: `${meta.color}1A` }}
    >
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
