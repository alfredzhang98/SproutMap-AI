import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CandidateCard } from "@/types/map";
import { TypeBadge } from "./TypeBadge";
import { useAppStore } from "@/store/useAppStore";

export function GhostNode({ data }: NodeProps) {
  const card = (data as { card: CandidateCard }).card;
  const addCandidateToNode = useAppStore((s) => s.addCandidateToNode);
  const discardCandidate = useAppStore((s) => s.discardCandidate);

  return (
    <div
      className="w-[200px] rounded-xl border-2 border-dashed px-3 py-2"
      style={{
        borderColor: "var(--primary)",
        background: "rgba(216, 243, 220, 0.55)",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center justify-between">
        <TypeBadge type={card.type} />
        <span className="text-[9px] text-[var(--text-muted)]">
          {Math.round(card.confidence * 100)}%
        </span>
      </div>
      <div className="mt-1 text-[13px] font-semibold leading-snug text-[var(--text-main)]">
        {card.title}
      </div>
      <div className="mt-1 text-[10px] italic text-[var(--text-muted)]">
        Suggested · not added yet
      </div>
      <div className="mt-2 flex gap-1">
        <button
          className="flex-1 rounded-md bg-[var(--primary-dark)] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90"
          onClick={(e) => {
            e.stopPropagation();
            if (card.suggestedParentId)
              addCandidateToNode(card.id, card.suggestedParentId);
          }}
        >
          Add
        </button>
        <button
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
          onClick={(e) => {
            e.stopPropagation();
            discardCandidate(card.id);
          }}
        >
          ✕
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
