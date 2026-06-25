"use client";

import { useAppStore } from "@/store/useAppStore";

function opTitle(payload: Record<string, unknown>): string {
  const t =
    (payload.title as string) ||
    (payload.newTitle as string) ||
    (payload.nodeId as string) ||
    (payload.relation as string) ||
    "";
  return t || "(operation)";
}

export function MapPatchPreview() {
  const patch = useAppStore((s) => s.pendingPatch);
  const togglePatchOp = useAppStore((s) => s.togglePatchOp);
  const acceptPatch = useAppStore((s) => s.acceptPatch);
  const rejectPatch = useAppStore((s) => s.rejectPatch);

  if (!patch) return null;
  const selectedCount = patch.operations.filter((o) => o.selected !== false).length;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface-soft)]">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-xs font-semibold text-[var(--text-main)]">
          Map patch preview
          <span className="ml-1 font-normal text-[var(--text-muted)]">
            · review before applying
          </span>
        </div>
        <span className="rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-[10px] font-medium text-[var(--primary-dark)]">
          {patch.intent.replace(/_/g, " ")}
        </span>
      </div>

      {patch.summary && (
        <div className="px-3 pb-1 text-[11px] leading-snug text-[var(--text-muted)]">
          {patch.summary}
        </div>
      )}

      <div className="max-h-[32vh] space-y-1 overflow-y-auto px-3 pb-2">
        {patch.operations.map((op) => (
          <label
            key={op.id}
            className="flex cursor-pointer items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5"
          >
            <input
              type="checkbox"
              checked={op.selected !== false}
              onChange={() => togglePatchOp(op.id)}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-[var(--surface-soft)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-muted)]">
                  {op.type.replace(/_/g, " ")}
                </span>
                <span className="truncate text-[12px] font-medium text-[var(--text-main)]">
                  {opTitle(op.payload)}
                </span>
              </div>
              {op.explanation && (
                <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[var(--text-muted)]">
                  {op.explanation}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 pb-3">
        <button
          onClick={acceptPatch}
          disabled={selectedCount === 0}
          className="rounded-md bg-[var(--primary-dark)] px-2.5 py-1.5 text-[11px] font-medium text-white enabled:hover:opacity-90 disabled:opacity-40"
        >
          Apply {selectedCount} change{selectedCount === 1 ? "" : "s"}
        </button>
        <button
          onClick={rejectPatch}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
