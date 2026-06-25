"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { MapCanvas } from "@/components/canvas/MapCanvas";
import { Inspector } from "@/components/inspector/Inspector";
import { ApiKeyModal } from "@/components/settings/ApiKeyModal";
import { HelpModal } from "@/components/settings/HelpModal";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

const AUTOMATION_MODES: { value: "manual" | "balanced" | "auto_assist"; label: string }[] =
  [
    { value: "manual", label: "Manual" },
    { value: "balanced", label: "Balanced" },
    { value: "auto_assist", label: "Auto-assist" },
  ];

function ToolButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-main)] transition enabled:hover:bg-[var(--surface-soft)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function TopBar({
  onOpenKey,
  onToggleSidebar,
  onOpenHelp,
}: {
  onOpenKey: () => void;
  onToggleSidebar: () => void;
  onOpenHelp: () => void;
}) {
  const workspaceTitle = useAppStore((s) => s.workspaceTitle);
  const setWorkspaceTitle = useAppStore((s) => s.setWorkspaceTitle);
  const apiKey = useAppStore((s) => s.apiKey);
  const runAutoLayout = useAppStore((s) => s.runAutoLayout);
  const saveWorkspace = useAppStore((s) => s.saveWorkspace);
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
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3">
      <button
        onClick={onToggleSidebar}
        title="Toggle maps sidebar"
        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
      >
        <span className="block text-base leading-none">☰</span>
      </button>

      <input
        value={workspaceTitle}
        onChange={(e) => setWorkspaceTitle(e.target.value)}
        className="min-w-0 max-w-[300px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:border-[var(--border)] focus:border-[var(--primary)]"
      />

      <div className="ml-auto flex items-center gap-1.5">
        <select
          value={automationMode}
          onChange={(e) => setAutomationMode(e.target.value as typeof automationMode)}
          title="How much the AI may change the map automatically"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text-main)] outline-none"
        >
          {AUTOMATION_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <ToolButton
          onClick={() => runRefactor()}
          disabled={isRefactoring || nodeCount === 0}
          title="Ask the AI to propose a cleanup patch"
        >
          {isRefactoring ? "Tidying…" : "Tidy"}
        </ToolButton>
        <ToolButton
          onClick={undoLastMapChange}
          disabled={undoStack.length === 0}
          title="Undo the last automatic map change"
        >
          Undo
        </ToolButton>
        <ToolButton onClick={runAutoLayout} title="Auto-arrange the map">
          Layout
        </ToolButton>

        <div className="mx-0.5 h-5 w-px bg-[var(--border)]" />

        <ToolButton
          onClick={() => {
            saveWorkspace();
            setSaved(true);
            setTimeout(() => setSaved(false), 1200);
          }}
          title="Save this map locally"
        >
          {saved ? "Saved ✓" : "Save"}
        </ToolButton>
        <ToolButton onClick={exportJson} title="Download this map as JSON">
          Export
        </ToolButton>
        <ToolButton onClick={() => fileRef.current?.click()} title="Import a map JSON">
          Import
        </ToolButton>
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
        <ToolButton onClick={onOpenHelp} title="Help & shortcuts">
          ?
        </ToolButton>

        <div className="mx-0.5 h-5 w-px bg-[var(--border)]" />

        <button
          onClick={onOpenKey}
          title="Manage your Gemini API key"
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: apiKey ? "var(--primary)" : "var(--danger)" }}
          />
          {apiKey ? "Key set" : "Add key"}
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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

  const cols = sidebarOpen
    ? "grid-cols-[220px_340px_1fr_320px]"
    : "grid-cols-[340px_1fr_320px]";

  return (
    <div className="flex h-screen flex-col">
      <div className={`grid min-h-0 flex-1 ${cols}`}>
        {sidebarOpen && (
          <aside className="min-h-0 border-r border-[var(--border)]">
            <WorkspaceSidebar onOpenHelp={() => setHelpOpen(true)} />
          </aside>
        )}
        <div className="col-span-3 flex min-h-0 flex-col">
          <TopBar
            onOpenKey={() => setKeyOpen(true)}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onOpenHelp={() => setHelpOpen(true)}
          />
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
        </div>
      </div>
      <ApiKeyModal open={keyOpen} onClose={() => setKeyOpen(false)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
