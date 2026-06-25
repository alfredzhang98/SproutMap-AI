"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { TypeBadge } from "@/components/canvas/nodes/TypeBadge";
import { CARD_DND_MIME } from "@/lib/dnd";
import type { CandidateCard } from "@/types/map";

function CardItem({ card }: { card: CandidateCard }) {
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const nodes = useAppStore((s) => s.nodes);
  const addCandidateToNode = useAppStore((s) => s.addCandidateToNode);
  const addCandidateAsIsland = useAppStore((s) => s.addCandidateAsIsland);
  const discardCandidate = useAppStore((s) => s.discardCandidate);
  const deferCandidate = useAppStore((s) => s.deferCandidate);
  const updateCandidate = useAppStore((s) => s.updateCandidate);

  const [editing, setEditing] = useState(false);

  const suggestedParent = card.suggestedParentId
    ? nodes.find((n) => n.id === card.suggestedParentId)
    : undefined;
  const targetNodeId = selectedNodeId ?? card.suggestedParentId;
  const targetLabel = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)?.data.map.title
    : suggestedParent?.data.map.title;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(CARD_DND_MIME, card.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="cursor-grab rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-sm transition hover:border-[var(--primary)] active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <TypeBadge type={card.type} />
        <span className="text-[10px] text-[var(--text-muted)]">
          {Math.round(card.confidence * 100)}% sure
        </span>
      </div>

      {editing ? (
        <input
          autoFocus
          value={card.title}
          onChange={(e) => updateCandidate(card.id, { title: e.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
          className="mt-1.5 w-full rounded border border-[var(--border)] px-1.5 py-1 text-[13px] font-semibold outline-none focus:border-[var(--primary)]"
        />
      ) : (
        <div className="mt-1.5 text-[13px] font-semibold leading-snug text-[var(--text-main)]">
          {card.title}
        </div>
      )}

      {card.oneLineSummary && (
        <div className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
          {card.oneLineSummary}
        </div>
      )}

      {(card.suggestedRelation || targetLabel) && (
        <div className="mt-1.5 text-[10px] text-[var(--text-muted)]">
          {card.suggestedRelation && (
            <span className="rounded bg-[var(--surface-soft)] px-1.5 py-0.5">
              {card.suggestedRelation.replace(/_/g, " ")}
            </span>
          )}
          {targetLabel && (
            <span className="ml-1">
              → <span className="font-medium">{targetLabel}</span>
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        <button
          disabled={!targetNodeId}
          onClick={() => targetNodeId && addCandidateToNode(card.id, targetNodeId)}
          className="rounded-md bg-[var(--primary-dark)] px-2 py-1 text-[10px] font-medium text-white enabled:hover:opacity-90 disabled:opacity-40"
          title={
            selectedNodeId
              ? "Add under the selected node"
              : "Add under the suggested parent"
          }
        >
          {selectedNodeId ? "Add to selected" : "Add to suggested"}
        </button>
        <button
          onClick={() =>
            addCandidateAsIsland(card.id, {
              x: 120 + Math.random() * 240,
              y: 120 + Math.random() * 240,
            })
          }
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
        >
          New island
        </button>
        <button
          onClick={() => setEditing((v) => !v)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
        >
          {editing ? "Done" : "Edit"}
        </button>
        <button
          onClick={() => deferCandidate(card.id)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
          title="Keep for later"
        >
          {card.status === "deferred" ? "Restore" : "Defer"}
        </button>
        <button
          onClick={() => discardCandidate(card.id)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--danger)] hover:bg-red-50"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

function Group({ title, cards }: { title: string; cards: CandidateCard[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {title} ({cards.length})
      </div>
      {cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </div>
  );
}

export function CandidateCardTray() {
  const candidateCards = useAppStore((s) => s.candidateCards);
  const nodes = useAppStore((s) => s.nodes);
  const acceptAllCandidates = useAppStore((s) => s.acceptAllCandidates);

  const pending = candidateCards.filter((c) => c.status === "pending");
  const deferred = candidateCards.filter((c) => c.status === "deferred");

  if (pending.length === 0 && deferred.length === 0) return null;

  const nodeIds = new Set(nodes.map((n) => n.id));
  const recommended = pending.filter(
    (c) => c.suggestedParentId && nodeIds.has(c.suggestedParentId)
  );
  const islands = pending.filter((c) => !c.suggestedParentId);
  const unlinked = pending.filter(
    (c) => c.suggestedParentId && !nodeIds.has(c.suggestedParentId)
  );

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface-soft)]">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-xs font-semibold text-[var(--text-main)]">
          Suggested cards
          <span className="ml-1 text-[var(--text-muted)]">({pending.length})</span>
        </div>
        {pending.length > 0 && (
          <button
            onClick={acceptAllCandidates}
            className="rounded-md bg-[var(--primary)] px-2 py-1 text-[10px] font-medium text-[var(--primary-dark)] hover:bg-[var(--accent)]"
          >
            Accept all
          </button>
        )}
      </div>
      <div className="max-h-[38vh] space-y-3 overflow-y-auto px-3 pb-3">
        <Group title="Recommended" cards={recommended} />
        <Group title="Possible new island" cards={islands} />
        <Group title="Unlinked ideas" cards={unlinked} />
        <Group title="Deferred" cards={deferred} />
      </div>
      <div className="px-3 pb-2 text-[10px] leading-snug text-[var(--text-muted)]">
        Drag a card onto a node, an edge, or empty canvas — or use the buttons.
      </div>
    </div>
  );
}
