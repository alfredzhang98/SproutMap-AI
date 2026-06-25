"use client";

const SECTIONS: { title: string; items: [string, string][] }[] = [
  {
    title: "The big idea",
    items: [
      ["Chat → Cards → Map", "Ask normally. The AI answers and proposes a few candidate cards. You decide which become permanent map nodes."],
      ["Cards vs nodes", "Cards (left tray) are temporary suggestions. Nodes (canvas) are permanent and feed future context."],
    ],
  },
  {
    title: "Top bar",
    items: [
      ["Automation mode", "Manual = cards only. Balanced (default) = AI may ghost-preview / scope-add. Auto-assist = AI may draft a starter map."],
      ["Tidy map", "Asks the AI to propose a cleanup patch (merge duplicates, fix relations). You confirm each change."],
      ["Undo", "Reverts the last automatic map change."],
      ["Auto layout", "Re-arranges nodes tidily; flows go left→right, hierarchies top→bottom."],
      ["Save / Export / Import", "Save persists locally. Export/Import move a map as JSON."],
    ],
  },
  {
    title: "Context scope (chat composer)",
    items: [
      ["Global", "Uses the whole workspace + recent chat."],
      ["Node", "Uses only the selected node, its path, children and siblings."],
      ["Subtree", "The node plus everything under it."],
      ["Island", "The whole topic island the node belongs to."],
    ],
  },
  {
    title: "Cards & the map",
    items: [
      ["Add to / New island", "Place a card under a node, or start a separate topic island."],
      ["Drag a card", "Drop on a node (child), an edge (insert between), or empty canvas (new island)."],
      ["Defer", "Keep a card for later without adding or discarding it."],
      ["Map patch preview", "When AI proposes several changes, review and check the ones to apply."],
    ],
  },
  {
    title: "Nodes",
    items: [
      ["Inspector", "Edit title, summaries, notes; see open questions & decisions."],
      ["Ask from this node", "Switches context to that node for a focused follow-up."],
      ["Re-summarize", "AI compresses the node's memory."],
      ["Tidy branch", "AI proposes a cleanup just for that subtree."],
    ],
  },
];

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-main)]">
            How SproutMap works
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
          >
            ✕
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {SECTIONS.map((sec) => (
            <div key={sec.title}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
                {sec.title}
              </div>
              <div className="space-y-1.5">
                {sec.items.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[140px_1fr] gap-3">
                    <div className="text-[12px] font-medium text-[var(--text-main)]">
                      {k}
                    </div>
                    <div className="text-[12px] leading-snug text-[var(--text-muted)]">
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
