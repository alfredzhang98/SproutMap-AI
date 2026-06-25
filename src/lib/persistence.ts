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
  version: 2;
  id: string;
  workspaceTitle: string;
  nodes: Node<{ map: MapNodeData }>[];
  edges: Edge<{ map: MapEdgeData }>[];
  messages: ChatMessage[];
  candidateCards: CandidateCard[];
  model: AllowedModel;
  contextMode: ContextMode;
  automationMode?: AutomationMode;
  createdAt: string;
  savedAt: string;
};

export type WorkspaceMeta = {
  id: string;
  title: string;
  updatedAt: string;
  nodeCount: number;
};

type WorkspaceIndex = {
  activeId?: string;
  list: WorkspaceMeta[];
};

const INDEX_KEY = "sproutmap.index.v1";
const WS_PREFIX = "sproutmap.ws.";
const LEGACY_KEY = "sproutmap.workspace.v1";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    console.warn("SproutMap: failed to persist", err);
  }
}

function readIndex(): WorkspaceIndex {
  const raw = safeGet(INDEX_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as WorkspaceIndex;
      if (parsed && Array.isArray(parsed.list)) return parsed;
    } catch {
      /* fall through */
    }
  }
  // Migrate a legacy single-workspace store if present.
  const legacy = safeGet(LEGACY_KEY);
  if (legacy) {
    try {
      const ws = JSON.parse(legacy);
      const id = ws.id || `ws_${Date.now().toString(36)}`;
      const migrated: PersistedWorkspace = {
        ...ws,
        version: 2,
        id,
        createdAt: ws.savedAt || new Date().toISOString(),
      };
      safeSet(WS_PREFIX + id, JSON.stringify(migrated));
      const index: WorkspaceIndex = {
        activeId: id,
        list: [
          {
            id,
            title: migrated.workspaceTitle,
            updatedAt: migrated.savedAt,
            nodeCount: migrated.nodes?.length ?? 0,
          },
        ],
      };
      safeSet(INDEX_KEY, JSON.stringify(index));
      if (typeof window !== "undefined") window.localStorage.removeItem(LEGACY_KEY);
      return index;
    } catch {
      /* ignore */
    }
  }
  return { list: [] };
}

function writeIndex(index: WorkspaceIndex) {
  safeSet(INDEX_KEY, JSON.stringify(index));
}

export function listWorkspaces(): WorkspaceMeta[] {
  return readIndex()
    .list.slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getActiveWorkspaceId(): string | undefined {
  return readIndex().activeId;
}

export function setActiveWorkspaceId(id: string) {
  const index = readIndex();
  writeIndex({ ...index, activeId: id });
}

export function loadWorkspaceById(id: string): PersistedWorkspace | null {
  const raw = safeGet(WS_PREFIX + id);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedWorkspace;
    return { ...parsed, version: 2, id };
  } catch {
    return null;
  }
}

export function saveWorkspaceDoc(ws: PersistedWorkspace) {
  safeSet(WS_PREFIX + ws.id, JSON.stringify(ws));
  const index = readIndex();
  const meta: WorkspaceMeta = {
    id: ws.id,
    title: ws.workspaceTitle,
    updatedAt: ws.savedAt,
    nodeCount: ws.nodes?.length ?? 0,
  };
  const list = index.list.filter((m) => m.id !== ws.id);
  list.push(meta);
  writeIndex({ activeId: ws.id, list });
}

export function deleteWorkspaceDoc(id: string): string | undefined {
  if (typeof window !== "undefined") window.localStorage.removeItem(WS_PREFIX + id);
  const index = readIndex();
  const list = index.list.filter((m) => m.id !== id);
  const activeId = index.activeId === id ? list[0]?.id : index.activeId;
  writeIndex({ activeId, list });
  return activeId;
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
    return { ...parsed, version: 2 };
  } catch {
    return null;
  }
}
