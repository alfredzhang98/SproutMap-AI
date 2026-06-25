"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function WorkspaceSidebar({
  onOpenHelp,
  onOpenGenerate,
}: {
  onOpenHelp: () => void;
  onOpenGenerate: () => void;
}) {
  const workspaces = useAppStore((s) => s.workspaces);
  const workspaceId = useAppStore((s) => s.workspaceId);
  const newWorkspace = useAppStore((s) => s.newWorkspace);
  const switchWorkspace = useAppStore((s) => s.switchWorkspace);
  const deleteWorkspace = useAppStore((s) => s.deleteWorkspace);
  const refreshWorkspaces = useAppStore((s) => s.refreshWorkspaces);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  return (
    <div className="flex h-full flex-col bg-[var(--surface-soft)]">
      <div className="flex items-center gap-1.5 px-3 py-3">
        <span className="text-base">🌱</span>
        <span className="text-sm font-bold text-[var(--primary-dark)]">SproutMap</span>
      </div>

      <div className="space-y-1.5 px-3 pb-2">
        <button
          onClick={newWorkspace}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--primary-dark)] px-3 py-2 text-xs font-medium text-white transition hover:opacity-90"
        >
          <span className="text-sm leading-none">+</span> New map
        </button>
        <button
          onClick={onOpenGenerate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-main)] transition hover:bg-white"
        >
          ✨ Generate map
        </button>
      </div>

      <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Your maps
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {workspaces.length === 0 && (
          <div className="px-2 py-2 text-[11px] text-[var(--text-muted)]">
            No maps yet.
          </div>
        )}
        {workspaces.map((ws) => {
          const active = ws.id === workspaceId;
          return (
            <div
              key={ws.id}
              onClick={() => switchWorkspace(ws.id)}
              className={
                "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition " +
                (active
                  ? "bg-[var(--surface)] font-medium text-[var(--text-main)] shadow-sm"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface)]/60")
              }
            >
              <span className="truncate">{ws.title || "Untitled map"}</span>
              <span className="ml-auto shrink-0 text-[9px] text-[var(--text-muted)]">
                {ws.nodeCount}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${ws.title || "Untitled map"}"?`))
                    deleteWorkspace(ws.id);
                }}
                className="hidden shrink-0 text-[var(--text-muted)] hover:text-[var(--danger)] group-hover:block"
                title="Delete map"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={onOpenHelp}
        className="m-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-main)] hover:bg-white"
      >
        ? Help & shortcuts
      </button>
    </div>
  );
}
