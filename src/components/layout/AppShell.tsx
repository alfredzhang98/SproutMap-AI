"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { MapCanvas } from "@/components/canvas/MapCanvas";
import { Inspector } from "@/components/inspector/Inspector";
import { ApiKeyModal } from "@/components/settings/ApiKeyModal";

const AUTOMATION_MODES: { value: "manual" | "balanced" | "auto_assist"; label: string }[] =
  [
    { value: "manual", label: "Manual" },
    { value: "balanced", label: "Balanced" },
    { value: "auto_assist", label: "Auto-assist" },
  ];

function TopBar({ onOpenKey }: { onOpenKey: () => void }) {
  const workspaceTitle = useAppStore((s) => s.workspaceTitle);
  const setWorkspaceTitle = useAppStore((s) => s.setWorkspaceTitle);
  const apiKey = useAppStore((s) => s.apiKey);
  const runAutoLayout = useAppStore((s) => s.runAutoLayout);
  const saveWorkspace = useAppStore((s) => s.saveWorkspace);
  const newWorkspace = useAppStore((s) => s.newWorkspace);
  const exportJson = useAppStore((s) => s.exportJson);
  const importJson = useAppStore((s) => s.importJson);
  const automationMode = useAppStore((s) => s.automationMode);
  const setAutomationMode = useAppStore((s) => s.setAutomationMode);
  const runRefactor = useAppStore((s) => s.runRefactor);
  const isRefactoring = useAppStore((s) => s.isRefactoring);
  const undoStack = useAppStore((s) => s.undoStack);
  const undoLastMapChange = useAppStore((s) => s.undoLastMapChange);
  const nodeCount = useAppStore((s) => s.nodes.length);

  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importJson(String(reader.result));
      if (!ok) alert("Could not import: invalid workspace JSON.");
    };
    reader.readAsText(file);
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4">
      <div className="flex items-center gap-1.5">
        <span className="text-base">🌱</span>
        <span className="text-sm font-bold text-[var(--primary-dark)]">
          SproutMap AI
        </span>
      </div>

      <div className="mx-2 h-5 w-px bg-[var(--border)]" />

      <input
        value={workspaceTitle}
        onChange={(e) => setWorkspaceTitle(e.target.value)}
        className="min-w-0 max-w-[280px] flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium outline-none hover:border-[var(--border)] focus:border-[var(--primary)]"
      />

      <div className="ml-auto flex items-center gap-1.5">
        <select
          value={automationMode}
          onChange={(e) =>
            setAutomationMode(e.target.value as typeof automationMode)
          }
          title="How much the AI may change the map automatically"
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text-main)] outline-none"
        >
          {AUTOMATION_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => runRefactor()}
          disabled={isRefactoring || nodeCount === 0}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-main)] enabled:hover:bg-[var(--surface-soft)] disabled:opacity-40"
          title="Ask the AI to propose a cleanup patch"
        >
          {isRefactoring ? "Tidying…" : "Tidy map"}
        </button>
        <button
          onClick={undoLastMapChange}
          disabled={undoStack.length === 0}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-main)] enabled:hover:bg-[var(--surface-soft)] disabled:opacity-40"
        >
          Undo
        </button>
        <button
          onClick={runAutoLayout}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
        >
          Auto layout
        </button>
        <button
          onClick={() => {
            saveWorkspace();
            setSaved(true);
            setTimeout(() => setSaved(false), 1200);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
        >
          {saved ? "Saved ✓" : "Save"}
        </button>
        <button
          onClick={exportJson}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
        >
          Export
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
        >
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => {
            if (confirm("Start a new workspace? Unsaved local data is replaced."))
              newWorkspace();
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
        >
          New
        </button>

        <div className="mx-1 h-5 w-px bg-[var(--border)]" />

        <button
          onClick={onOpenKey}
          className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: apiKey ? "var(--primary)" : "var(--danger)" }}
          />
          {apiKey ? "API key set" : "Add API key"}
        </button>
      </div>
    </header>
  );
}

export function AppShell() {
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);
  const apiKey = useAppStore((s) => s.apiKey);
  const [keyOpen, setKeyOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Prompt for the key on first load if none present.
  useEffect(() => {
    if (hydrated && !apiKey) setKeyOpen(true);
  }, [hydrated, apiKey]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-[var(--text-muted)]">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar onOpenKey={() => setKeyOpen(true)} />
      <div className="grid min-h-0 flex-1 grid-cols-[340px_1fr_320px]">
        <aside className="min-h-0 border-r border-[var(--border)] bg-[var(--background)]">
          <ChatPanel />
        </aside>
        <main className="min-h-0 bg-[var(--background)]">
          <MapCanvas />
        </main>
        <aside className="min-h-0 border-l border-[var(--border)] bg-[var(--surface)]">
          <Inspector />
        </aside>
      </div>
      <ApiKeyModal open={keyOpen} onClose={() => setKeyOpen(false)} />
    </div>
  );
}
