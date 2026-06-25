# 🌱 SproutMap AI

**Turn conversations into living maps.**

SproutMap AI is a visual AI workspace that converts linear LLM conversations into
editable candidate cards and a living mind-map / flow-map canvas, while preserving
node-level context for focused follow-up questions.

It is **chat-first, card-first, and node-scoped** — not a generic "generate a map
from text" tool. You chat normally, the model proposes 3–7 atomic cards, and *you*
decide which cards become permanent map nodes.

---

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

1. On the landing page (`/`), paste your **Google Gemini API key** (free at
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey)) and click **Start workspace**.
2. Ask a broad question. You get a normal answer plus candidate cards.
3. Drag cards onto the canvas (or use the buttons) to grow the map.
4. Select any node and ask a follow-up with scoped context.

> Your API key lives only in the browser tab (`sessionStorage`). It is sent to the
> serverless route **only** to call Gemini and is never stored or logged on the
> server. Do not use this on an untrusted deployment.

---

## How it works

Three levels of information keep the map concise:

| Level | What | Where |
| ----- | ---- | ----- |
| 1. Chat answer | Full LLM answer (can be long) | Left chat panel |
| 2. Candidate cards | Extracted atomic units, editable, not committed | Card tray |
| 3. Map nodes | Accepted knowledge units, part of future context | Canvas |

### Drag-to-map behavior

- **Onto a node** → creates a child node (`contains` or the suggested relation).
- **Onto an edge** → inserts a node between the two endpoints.
- **Onto empty canvas** → creates a new topic island.

High-confidence suggestions (≥ 0.75) also appear as dashed **ghost nodes** next to
their suggested parent — click **Add** to commit.

### Context modes

When you ask from a selected node, only relevant context is assembled
(`src/lib/context.ts`):

- **Global** — workspace + recent chat history.
- **Selected node** — root→node path, the node, its children & siblings.
- **Selected subtree** — the above plus the full subtree summaries.

---

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **@xyflow/react** (React Flow) canvas
- **Zustand** state (`src/store/useAppStore.ts`)
- **Tailwind CSS** with the light-green theme (`src/styles/globals.css`)
- **@dagrejs/dagre** auto-layout (`src/lib/layout.ts`)
- **localStorage** persistence + JSON export/import (`src/lib/persistence.ts`)
- **Google Gemini API** (`generateContent`) via `/api/chat-map` with structured JSON output

### Models

The route validates the model against a whitelist (`src/types/llm.ts`):

```ts
const ALLOWED_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
]; // default: gemini-3-flash-preview
```

Change this list to match models available to your Gemini key (list yours via
`GET https://generativelanguage.googleapis.com/v1beta/models`).

---

## Project structure

```text
src/
  app/
    page.tsx              # landing
    app/page.tsx          # workspace
    api/chat-map/route.ts # Gemini proxy (no key storage/logging)
  components/
    layout/AppShell.tsx
    chat/ChatPanel.tsx
    chat/CandidateCardTray.tsx
    canvas/MapCanvas.tsx
    canvas/nodes/{RootNode,MapNode,GhostNode,TypeBadge}.tsx
    inspector/{Inspector,NodeInspector,EdgeInspector}.tsx
    settings/ApiKeyModal.tsx
  lib/{gemini,context,layout,persistence,ids,dnd}.ts
  store/useAppStore.ts
  types/{map,llm}.ts
  styles/globals.css
```

---

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build (also type-checks)
npm run start   # serve the production build
npm run lint    # eslint
```
