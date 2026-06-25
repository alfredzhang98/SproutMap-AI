"use client";

import { useAppStore } from "@/store/useAppStore";
import type { AutomationLevel } from "@/types/agent";

const LEVEL_LABEL: Record<AutomationLevel, string> = {
  none: "Answered only",
  candidate_only: "Candidate cards only",
  ghost_preview: "Ghost preview on canvas",
  auto_add_scoped: "Auto-added to map",
  patch_preview: "Patch needs review",
  full_auto_draft: "Draft map generated",
};

export function AutomationBanner() {
  const banner = useAppStore((s) => s.lastAutomation);
  const undoStack = useAppStore((s) => s.undoStack);
  const undoLastMapChange = useAppStore((s) => s.undoLastMapChange);
  const dismiss = useAppStore((s) => s.dismissAutomationBanner);

  if (!banner) return null;

  return (
    <div className="mx-3 mb-2 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            <span className="text-[11px] font-semibold text-[var(--text-main)]">
              AI action: {LEVEL_LABEL[banner.level]}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] leading-snug text-[var(--text-muted)]">
            {banner.summary} · {banner.reason}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {banner.applied && banner.allowUndo && undoStack.length > 0 && (
            <button
              onClick={undoLastMapChange}
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--text-main)] hover:bg-white"
            >
              Undo
            </button>
          )}
          <button
            onClick={dismiss}
            className="px-1 text-[11px] font-bold text-[var(--text-muted)]"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
