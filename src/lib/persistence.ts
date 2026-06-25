import type { Edge, Node } from "@xyflow/react";
import type {
  CandidateCard,
  ChatMessage,
  MapEdgeData,
  MapNodeData,
} from "@/types/map";
import type { AllowedModel } from "@/types/llm";
import type { AutomationMode } from "@/types/agent";
import type { ContextMode } from "./context";

export type PersistedWorkspace = {
  version: 1;
  workspaceTitle: string;
  nodes: Node<{ map: MapNodeData }>[];
  edges: Edge<{ map: MapEdgeData }>[];
  messages: ChatMessage[];
  candidateCards: CandidateCard[];
  model: AllowedModel;
  contextMode: ContextMode;
  automationMode?: AutomationMode;
  savedAt: string;
};

const STORAGE_KEY = "sproutmap.workspace.v1";

export function saveToLocal(ws: PersistedWorkspace): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
  } catch (err) {
    // Storage may be full or unavailable; fail silently for MVP.
    console.warn("SproutMap: failed to persist workspace", err);
  }
}

export function loadFromLocal(): PersistedWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWorkspace;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch (err) {
    console.warn("SproutMap: failed to load workspace", err);
    return null;
  }
}

export function clearLocal(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function exportWorkspaceJson(ws: PersistedWorkspace): void {
  const blob = new Blob([JSON.stringify(ws, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = (ws.workspaceTitle || "sproutmap")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  a.href = url;
  a.download = `${safeTitle || "sproutmap"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseWorkspaceJson(text: string): PersistedWorkspace | null {
  try {
    const parsed = JSON.parse(text) as PersistedWorkspace;
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) return null;
    return { ...parsed, version: 1 };
  } catch {
    return null;
  }
}
