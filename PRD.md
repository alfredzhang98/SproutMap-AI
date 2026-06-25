# PRD: SproutMap AI — AI Conversation-to-Map Workspace

## 1. Product Name

**SproutMap AI**

### Tagline

**Turn conversations into living maps.**

### One-line positioning

SproutMap AI is a visual AI workspace that converts linear LLM conversations into editable cards, mind maps, and flow maps, while preserving node-level context for focused follow-up conversations.

### Chinese positioning

SproutMap AI 是一个“会生长的 AI 对话地图”：用户先像普通 ChatGPT 一样对话，AI 自动把回答提炼成结构化卡片，用户可以把卡片拖到画布上形成思维导图、流程图或离散主题岛，并在任意节点继续深入提问，而不会让上下文串线。

---

## 2. Core Problem

Current AI chat interfaces are linear. When the LLM answers with parallel points such as 1, 2, 3, 4, and 5, the user often wants to explore each point independently. However, after exploring point 1 deeply, the chat context becomes polluted, and points 2–5 lose their original clean structure.

Existing AI mind map tools mainly solve “generate a map from content”, but the deeper problem is:

1. How to transform chat output into reusable atomic knowledge cards.
2. How to let users decide which AI-generated cards should become map nodes.
3. How to distinguish hierarchy, sequence, comparison, association, and unrelated topics.
4. How to keep detailed context available without overloading the visual map.
5. How to ask follow-up questions from any map node with only the relevant context.

SproutMap AI should solve this by combining a chat panel, a candidate-card tray, a visual map canvas, and node-scoped context assembly.

---

## 3. Target Users

### Primary users

1. Researchers and PhD students
   Need to structure literature, paper ideas, experimental plans, rebuttal points, and technical systems.

2. Product builders and indie hackers
   Need to turn brainstorming chats into product requirements, feature trees, user flows, and implementation plans.

3. Writers, screenwriters, and content creators
   Need to explore story structure, characters, scenes, branching narratives, and different generation methods.

4. Consultants, analysts, and strategy workers
   Need to compare options, map decisions, identify relationships, and build evolving knowledge bases.

### Initial MVP user

A single power user who already uses ChatGPT heavily and frequently loses structure in long conversations.

---

## 4. Product Principle

The product must not dump long AI answers directly into a map.

The map should always stay concise.

The detailed content should live behind each node as expandable summaries, source messages, and node-level context.

### Core design rule

**Map nodes are not chat messages. Map nodes are distilled thinking units.**

Each node should have:

1. A short title.
2. A one-sentence summary.
3. Optional expanded detail summary.
4. Source message references.
5. Relationship to other nodes.
6. Context scope for future LLM calls.

---

## 5. MVP Product Scope

### MVP must include

1. Chat interface with Google Gemini API key input.
2. LLM response displayed as normal text.
3. AI-generated candidate cards extracted from the response.
4. Drag-and-drop cards from chat panel to canvas.
5. Visual canvas with editable nodes and edges.
6. Auto-suggested relationship between card and selected node.
7. Root topic generation from the user’s first request.
8. Node-scoped follow-up chat.
9. Basic context assembly from selected node path.
10. Local persistence in browser storage.
11. Light green visual theme.

### MVP should not include yet

1. Team collaboration.
2. User accounts.
3. Subscription and payment system.
4. Multi-model support.
5. File upload.
6. Web search.
7. Full semantic embedding search.
8. Real-time multiplayer.
9. Mobile optimization.
10. Complex presentation/export features.

---

## 6. Key User Workflow

## 6.1 First-use workflow

1. User opens SproutMap AI.

2. User enters their Google Gemini API key.

3. User starts a new workspace.

4. User writes a broad requirement, for example:

   “I want to build a tool that turns GPT conversations into mind maps. How should I design the user logic?”

5. LLM generates:

   * A concise answer.
   * A workspace title.
   * A root topic.
   * 3–7 candidate cards.
   * Suggested relationships among cards.

6. The map canvas creates a root node automatically.

7. Candidate cards appear in the chat-side card tray.

8. User can:

   * Add all cards to map.
   * Drag one card to root.
   * Ignore some cards.
   * Edit card title before adding.
   * Ask follow-up about one card.

---

## 6.2 Normal chat-to-card workflow

When the LLM produces structured content, the app should not immediately force all points into the map.

Instead, the app creates a **Map Patch Preview**.

A Map Patch Preview contains:

1. Proposed anchor node.
2. Proposed new cards.
3. Proposed relationship type.
4. Confidence score.
5. User actions:

   * Accept all.
   * Add selected.
   * Drag manually.
   * Regenerate structure.
   * Discard.

This prevents the map from becoming noisy.

---

## 6.3 Drag-to-map behavior

### Drag card onto an existing node

Default action: create a child node.

Example:

User drags “Three methods of script generation” onto “Script Storyboarding”.

Result:

```text
Script Storyboarding
└── Three methods of script generation
```

### Drag card onto empty canvas

Default action: create a new topic island.

Example:

User asks about “GPU video-generation business” while the current map is about “paper writing”.

Result:

```text
Main map island: Paper Writing
Separate island: GPU Video Business
```

### Drag card onto an edge

Default action: insert the card between two nodes.

Example:

```text
Before:
Research question → Experiment design

After:
Research question → Hypothesis refinement → Experiment design
```

### Drag card near sibling nodes

Default action: offer sibling placement.

Example:

```text
Methods
├── Method A
├── Method B
└── Method C
```

---

## 7. Core Interaction Logic

## 7.1 Three-level structure

SproutMap should separate information into three levels:

### Level 1: Chat answer

This is the full LLM answer shown in the chat panel. It can be long.

### Level 2: Candidate cards

These are extracted atomic units. They are concise, editable, and not yet committed to the map.

### Level 3: Map nodes

These are accepted knowledge units. They live on the canvas and become part of future context.

This solves the problem of AI generating too much content. The user sees the full answer, but only selected distilled cards become permanent map structure.

---

## 7.2 Card types

Each candidate card should have a type. The type controls how it is added to the map.

Recommended MVP card types:

1. **Topic**
   A high-level subject or theme.

2. **Concept**
   A reusable idea or definition.

3. **Method**
   A possible approach or strategy.

4. **Step**
   A sequential action in a process.

5. **Question**
   A follow-up question worth exploring.

6. **Decision**
   A conclusion, design choice, or trade-off.

7. **Evidence**
   A source, rationale, example, or supporting argument.

8. **Risk**
   A limitation, ambiguity, or unresolved issue.

MVP can visually distinguish them with subtle icons and small labels.

---

## 7.3 Relationship types

Each edge should have a semantic relation. Do not use only generic lines.

Recommended MVP relation types:

1. **contains**
   Parent-child hierarchy.

2. **part_of**
   Subcomponent relation.

3. **next_step**
   Ordered process relation.

4. **option_of**
   Alternative method or choice.

5. **supports**
   Evidence supports a claim.

6. **contradicts**
   Evidence or argument challenges a claim.

7. **relates_to**
   Loose association.

8. **derived_from**
   Card generated from a previous answer or node.

9. **unresolved_question**
   Open question attached to a node.

The visual map should show most edges simply, but the relation label should be editable.

---

## 8. Auto-connection Rules

The system should not fully auto-connect everything. Instead, it should use confidence-based auto-suggestion.

## 8.1 If no map exists

Create a root node from the conversation title.

Example:

User prompt:

“我想开发一个思维导图形式的 GPT 对话工具。”

AI creates:

```text
Root node: AI Conversation Mind Map Tool
```

Then candidate cards appear below the root as suggestions.

---

## 8.2 If user has selected a node

Treat the selected node as the default context anchor.

Example:

Selected node: “Script Storyboarding”

User asks:

“剧本生成的三种方法是什么？”

AI output should create three Method cards under “Script Storyboarding” unless relevance is low.

---

## 8.3 If the user asks “how to / steps / workflow / process”

Use flow mode.

Example:

Question:

“How do we build a script storyboard?”

Map structure:

```text
Script Storyboarding
└── Workflow
    ├── 1. Define story goal
    ├── 2. Break into scenes
    ├── 3. Generate shot list
    ├── 4. Add camera and timing
    └── 5. Review continuity
```

Edges should be `next_step`, not generic hierarchy.

---

## 8.4 If the user asks “types / methods / options / approaches”

Use parallel branch mode.

Example:

Question:

“What are three methods for script generation?”

Map structure:

```text
Script Generation Methods
├── Template-based generation
├── Character-driven generation
└── Scene-by-scene generation
```

Edges should be `option_of`.

---

## 8.5 If the new question is weakly related to the current map

Create a discrete topic island.

Example:

Current map: “AI paper writing”

New question:

“How can I earn money with RTX 5090?”

The system should not force this under “AI paper writing”.

It should create:

```text
Separate island: RTX 5090 Monetization
```

---

## 8.6 If relationship confidence is high

Show ghost nodes on the map.

Ghost nodes are temporary AI suggestions. They become real nodes only after user confirmation.

Confidence threshold:

```text
confidence >= 0.75: show ghost nodes attached to suggested anchor
0.45 <= confidence < 0.75: keep in card tray with suggested anchor label
confidence < 0.45: create as unlinked candidate card
```

---

## 8.7 User correction should train local behavior

If the user repeatedly moves “Method” cards under a certain node type, the local session should learn that placement preference.

MVP can implement this as simple local rules, not ML.

Example:

```json
{
  "userPreferenceRules": [
    {
      "whenCardType": "Method",
      "preferredRelation": "option_of",
      "preferredParentType": "Topic"
    }
  ]
}
```

---

## 9. Context Management

This is the most important part of the product.

The app should never send the entire conversation to the LLM by default.

Instead, it should assemble context based on the selected node.

## 9.1 Node data model

Each node stores:

```ts
type MapNodeData = {
  id: string;
  title: string;
  type: "root" | "topic" | "concept" | "method" | "step" | "question" | "decision" | "evidence" | "risk";
  oneLineSummary: string;
  detailSummary?: string;
  userNotes?: string;
  sourceMessageIds: string[];
  parentId?: string;
  topicIslandId: string;
  orderIndex?: number;
  tags: string[];
  createdBy: "user" | "ai";
  updatedAt: string;
  isLocked?: boolean;
};
```

## 9.2 Edge data model

```ts
type MapEdgeData = {
  id: string;
  source: string;
  target: string;
  relation:
    | "contains"
    | "part_of"
    | "next_step"
    | "option_of"
    | "supports"
    | "contradicts"
    | "relates_to"
    | "derived_from"
    | "unresolved_question";
  label?: string;
  confidence?: number;
  createdBy: "user" | "ai";
  isSuggested?: boolean;
};
```

## 9.3 Message data model

```ts
type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  selectedNodeId?: string;
  generatedCardIds?: string[];
};
```

## 9.4 Candidate card data model

```ts
type CandidateCard = {
  id: string;
  title: string;
  type: MapNodeData["type"];
  oneLineSummary: string;
  detailSummary?: string;
  suggestedParentId?: string;
  suggestedRelation?: MapEdgeData["relation"];
  confidence: number;
  sourceMessageId: string;
  status: "pending" | "accepted" | "discarded";
};
```

---

## 10. Context Assembly Algorithm

When the user asks a question from a selected node, the system should build context as follows.

### Inputs

1. Current user question.
2. Selected node.
3. Ancestor path from root to selected node.
4. Selected node detail summary.
5. Direct children summaries.
6. Sibling summaries.
7. Relevant recent chat messages.
8. Global map index.

### Prompt context order

```text
1. Product/system instruction
2. Current map root title
3. Selected node path
4. Selected node summary and detail
5. Nearby nodes
6. Recent user edits
7. Current user question
```

### Do not include by default

1. Full entire chat history.
2. Unrelated topic islands.
3. Discarded cards.
4. Long raw messages unless explicitly requested.

### Example context payload

```json
{
  "workspaceTitle": "AI Conversation Mind Map Tool",
  "selectedPath": [
    "AI Conversation Mind Map Tool",
    "User Interaction Logic",
    "Candidate Card Workflow"
  ],
  "selectedNode": {
    "title": "Candidate Card Workflow",
    "summary": "LLM outputs are distilled into user-confirmable cards before entering the map.",
    "detail": "Cards prevent automatic overpopulation of the mind map and allow the user to decide which ideas become persistent knowledge nodes."
  },
  "nearbyNodes": [
    {
      "title": "Ghost Node Preview",
      "summary": "AI suggestions appear as temporary map nodes before confirmation."
    },
    {
      "title": "Manual Drag-to-Attach",
      "summary": "Users can drag cards to a target node, edge, or empty canvas."
    }
  ],
  "userQuestion": "How should we design the accept-all and manual drag behavior?"
}
```

---

## 11. LLM Output Contract

The LLM should return both a natural language answer and structured map operations.

Use a structured JSON response.

```ts
type LLMStructuredResponse = {
  answer: string;
  workspaceTitleSuggestion?: string;
  selectedAnchorId?: string;
  intent:
    | "general_answer"
    | "create_root"
    | "expand_topic"
    | "create_flow"
    | "create_options"
    | "compare"
    | "create_discrete_topic"
    | "refine_existing_nodes";
  candidateCards: CandidateCardDraft[];
  suggestedEdges: SuggestedEdgeDraft[];
  mapPatchSummary: string;
};

type CandidateCardDraft = {
  tempId: string;
  title: string;
  type: "topic" | "concept" | "method" | "step" | "question" | "decision" | "evidence" | "risk";
  oneLineSummary: string;
  detailSummary?: string;
  suggestedParentTitle?: string;
  suggestedRelation?: MapEdgeData["relation"];
  confidence: number;
};

type SuggestedEdgeDraft = {
  sourceTempIdOrExistingId: string;
  targetTempIdOrExistingId: string;
  relation: MapEdgeData["relation"];
  label?: string;
  confidence: number;
};
```

Rules for the LLM:

1. Generate at most 7 candidate cards per response.
2. Prefer fewer, higher-quality cards.
3. Each card must express one atomic idea.
4. Card titles must be short.
5. Long reasoning should stay in `detailSummary`, not the map title.
6. If the user asks for a process, generate ordered step cards.
7. If the user asks for options, generate parallel method cards.
8. If the question is unrelated to the selected node, suggest a discrete topic island.
9. Never overwrite user-edited node titles without confirmation.
10. Never auto-delete nodes.

---

## 12. UI Layout

## 12.1 Desktop MVP layout

Use a three-panel layout.

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Bar: SproutMap AI | Workspace Title | API Status | Save   │
├───────────────────┬──────────────────────────────┬───────────┤
│ Left Chat Panel   │ Center Canvas                │ Right Node │
│                   │                              │ Inspector │
│ User messages     │ React Flow canvas            │           │
│ AI responses      │ Root / nodes / edges         │ Title     │
│ Candidate cards   │ Ghost suggestions            │ Summary   │
│                   │                              │ Detail    │
│ Input box         │                              │ Relation  │
└───────────────────┴──────────────────────────────┴───────────┘
```

## 12.2 Left panel

Contains:

1. Chat transcript.
2. Current answer.
3. Candidate card tray.
4. Input box.
5. Context selector:

   * Ask globally.
   * Ask from selected node.
   * Ask from selected subtree.

Candidate card actions:

1. Add to selected node.
2. Drag to canvas.
3. Edit title.
4. Expand detail.
5. Discard.

---

## 12.3 Center canvas

Use React Flow.

Canvas features:

1. Pan and zoom.
2. Drag nodes.
3. Drag candidate cards into canvas.
4. Select node.
5. Select edge.
6. Ghost suggested nodes.
7. Fit view.
8. Auto layout.
9. Manual layout mode.

Node visual design:

1. Rounded cards.
2. Light green root node.
3. White child nodes.
4. Soft green border.
5. Small type badge.
6. One-line summary shown only at medium zoom.
7. Detail shown in inspector, not on canvas by default.

---

## 12.4 Right inspector

When a node is selected:

1. Editable title.
2. Editable one-line summary.
3. Detail summary.
4. User notes.
5. Source messages.
6. Ask from this node button.
7. Add child manually.
8. Re-summarize node.
9. Lock node title.

When an edge is selected:

1. Source node.
2. Target node.
3. Relation type.
4. Editable label.
5. Delete edge.

---

## 13. Visual Design

## 13.1 Theme

Primary color: light green.

Suggested palette:

```css
--background: #F7FBF6;
--surface: #FFFFFF;
--surface-soft: #EEF8EF;
--primary: #74C69D;
--primary-dark: #40916C;
--primary-light: #D8F3DC;
--accent: #B7E4C7;
--text-main: #1B1F1D;
--text-muted: #66736B;
--border: #DCEBDD;
--danger: #D9534F;
--warning: #F2C94C;
```

## 13.2 Visual identity

The product should feel calm, clear, and research-friendly.

Avoid:

1. Overly playful colors.
2. Excessive gradients.
3. Too many icons.
4. Overloaded node text.
5. Auto-generated spaghetti graphs.

Use:

1. Soft green background.
2. White cards.
3. Rounded corners.
4. Clear node hierarchy.
5. Smooth but not flashy animations.

---

## 14. Technical Architecture

## 14.1 Recommended MVP stack

Frontend:

1. React
2. TypeScript
3. Vite or Next.js
4. React Flow
5. Zustand for state
6. Tailwind CSS
7. shadcn/ui or Radix UI
8. Dexie.js for IndexedDB persistence

Backend:

Option A for fastest MVP:

1. Next.js API route
2. Google Gemini API (`generateContent`)
3. No user database
4. User provides API key per session

Option B for pure frontend prototype:

1. Store API key in browser session storage
2. Make calls through a minimal API proxy
3. Warn user that API key is local and not stored permanently

Recommended MVP choice:

Use Next.js with an API route. The browser sends the user’s API key to the serverless route for each request. The serverless route forwards the request to the Google Gemini API and must not log or store the key.

---

## 14.2 API-key handling

MVP principle:

1. User provides their own Google Gemini API key.
2. The app does not store the key on the server.
3. The key can be stored in sessionStorage for convenience.
4. The user can clear it at any time.
5. The app should show a warning: “Your key is used only to call the Gemini API. Do not use this on an untrusted deployment.”

Do not build payment or subscription in MVP.

---

## 14.3 Model policy

Only allow selected modern Google Gemini models.

Recommended whitelist:

```ts
const ALLOWED_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];
```

Default model:

```ts
"gemini-3-flash-preview"
```

Reason:

1. Strong, low-cost Flash tier.
2. Good enough for structured extraction.
3. Faster iteration.

Use a stronger model (e.g. `gemini-3.1-pro-preview` / `gemini-2.5-pro`) only for:

1. Complex map restructuring.
2. Long context synthesis.
3. Deep reasoning.
4. Large map summarization.

Structured output is enforced via the Gemini `generationConfig.responseSchema`
with `responseMimeType: "application/json"`.

---

## 15. Main Product Modes

## 15.1 Chat mode

User talks normally.

System extracts candidate cards.

## 15.2 Map mode

User organizes accepted cards.

## 15.3 Node chat mode

User selects a node and asks a local question.

## 15.4 Flow mode

For ordered processes.

## 15.5 Topic island mode

For unrelated topics.

MVP should automatically switch between these based on user intent, but always let the user override.

---

## 16. Intent Classification

Before generating map cards, classify user intent.

Recommended intent labels:

```ts
type UserIntent =
  | "ask_general"
  | "expand_selected_node"
  | "generate_options"
  | "generate_steps"
  | "compare_options"
  | "summarize_current_branch"
  | "create_new_topic"
  | "edit_map"
  | "ask_about_existing_map";
```

Intent examples:

1. “剧本生成的三种方法是什么？”
   Intent: `generate_options`

2. “如何构建剧本分镜？”
   Intent: `generate_steps`

3. “继续深入第二点。”
   Intent: `expand_selected_node`

4. “这个和当前主题无关，但我想问 5090 怎么赚钱。”
   Intent: `create_new_topic`

5. “把这几个点整理得更清晰。”
   Intent: `edit_map`

---

## 17. MVP Functional Requirements

## 17.1 Workspace

User can:

1. Create a new workspace.
2. Rename workspace.
3. Save workspace locally.
4. Load previous workspace.
5. Delete workspace locally.

## 17.2 Chat

User can:

1. Send a prompt.
2. View AI answer.
3. View generated candidate cards.
4. Select context scope.
5. Ask from selected node.

## 17.3 Candidate cards

User can:

1. Edit title.
2. Edit summary.
3. Drag card to map.
4. Add card to selected node.
5. Accept all suggested cards.
6. Discard card.

## 17.4 Map

User can:

1. Create node.
2. Edit node.
3. Delete node.
4. Move node.
5. Connect nodes.
6. Edit edge relation.
7. Auto-layout graph.
8. Select node for context.

## 17.5 Node context

User can:

1. Ask question from selected node.
2. Expand selected node.
3. Summarize selected subtree.
4. Show source chat messages.
5. Add manual note to node.

---

## 18. Non-functional Requirements

1. First screen should load quickly.
2. LLM response should stream if possible.
3. Map operations should feel instant.
4. Node editing should not require modal windows.
5. The product should work on desktop first.
6. The MVP should be usable without login.
7. Local data should remain available after browser refresh.
8. The UI should avoid overwhelming the user with too many AI suggestions.

---

## 19. Recommended MVP Pages

### `/`

Landing + product entry

Sections:

1. Product name.
2. One-line value proposition.
3. API key input.
4. Start workspace button.
5. Privacy note.

### `/app`

Main workspace

Contains:

1. Chat panel.
2. Canvas.
3. Inspector.
4. Top bar.
5. API key status.

No need for pricing page in MVP.

---

## 20. MVP User Stories

### Story 1: Start a map from conversation

As a user, I want to describe a broad topic, so that the system creates a root map and candidate cards.

Acceptance criteria:

1. User enters a prompt.
2. AI returns answer.
3. Root node appears.
4. Candidate cards appear.
5. User can add cards to map.

---

### Story 2: Add AI card to map manually

As a user, I want to drag a generated card to the canvas, so that I control what becomes permanent structure.

Acceptance criteria:

1. Candidate card can be dragged.
2. Dropping on a node creates a child.
3. Dropping on empty canvas creates a topic island.
4. Dropping on edge inserts node.
5. User can undo the action.

---

### Story 3: Ask from selected node

As a user, I want to select a node and ask a follow-up question, so that only relevant context is used.

Acceptance criteria:

1. User selects node.
2. Chat input shows “asking from selected node”.
3. LLM receives selected path and nearby summaries.
4. New candidate cards are suggested under the selected node.
5. Other branches are not polluted.

---

### Story 4: Generate flow from process question

As a user, I want a “how-to” answer to become a flow, so that step order is preserved.

Acceptance criteria:

1. User asks a process question.
2. AI returns step cards.
3. Edges use `next_step`.
4. User can reorder steps.
5. User can expand any step individually.

---

### Story 5: Create discrete topic island

As a user, I want unrelated questions to create separate islands, so that my map does not become confused.

Acceptance criteria:

1. System detects weak relevance.
2. Candidate cards are marked as new topic.
3. Dropping on empty canvas creates separate island.
4. User can later connect islands manually.

---

## 21. Success Metrics

For MVP, measure manually first.

### Product success

1. User can turn one messy ChatGPT planning session into a clean map.
2. User can continue from a node without losing the rest of the structure.
3. User feels the map remains concise after 30 minutes of use.
4. User can find previous reasoning without scrolling chat history.

### Quantitative metrics

1. Number of accepted cards per session.
2. Ratio of generated cards to accepted cards.
3. Number of node-scoped follow-up questions.
4. Number of manual edge corrections.
5. Average cards per AI response.
6. Time from first prompt to usable map.

### MVP target

1. 5–7 generated cards per answer maximum.
2. 40–70% accepted-card rate.
3. At least 3 node-scoped follow-ups per serious session.
4. User can build a 30-node map without losing clarity.

---

## 22. Product Risks

### Risk 1: AI generates too many nodes

Mitigation:

1. Limit to 7 candidate cards.
2. Use staging tray.
3. Require user confirmation.
4. Use ghost nodes before commitment.

### Risk 2: Map becomes visually messy

Mitigation:

1. Auto-layout button.
2. Topic islands.
3. Collapse/expand subtree.
4. Show detail only in inspector.

### Risk 3: Context assembly becomes wrong

Mitigation:

1. Always show selected context mode.
2. Allow user to switch global/node/subtree context.
3. Keep source messages linked.
4. Show “context preview” before sending in advanced mode.

### Risk 4: User does not understand card vs node

Mitigation:

1. Candidate cards are temporary.
2. Map nodes are permanent.
3. Use clear labels:

   * “Suggested cards”
   * “Add to map”
   * “Accepted node”

### Risk 5: API key safety

Mitigation:

1. No server-side storage.
2. Disable server logs for API key.
3. Clear API key button.
4. Explicit warning in settings.

---

## 23. MVP Development Milestones

### Milestone 1: Static map + chat shell

1. Build app layout.
2. Add React Flow canvas.
3. Add static nodes and edges.
4. Add chat panel.
5. Add inspector.

### Milestone 2: Local state and persistence

1. Add Zustand store.
2. Add node/edge CRUD.
3. Add IndexedDB persistence.
4. Add workspace save/load.

### Milestone 3: LLM integration

1. Add API key input.
2. Add API route.
3. Call Google Gemini API (`generateContent`).
4. Parse structured JSON output.
5. Show answer and candidate cards.

### Milestone 4: Card-to-map workflow

1. Generate candidate cards.
2. Drag cards to canvas.
3. Add to selected node.
4. Create ghost suggestions.
5. Accept/discard cards.

### Milestone 5: Node-scoped context

1. Select node as context.
2. Assemble selected node path.
3. Send context payload to LLM.
4. Attach new cards to selected node.
5. Add context mode indicator.

### Milestone 6: Polish and usability

1. Auto-layout.
2. Collapse subtree.
3. Edit edge relation.
4. Improve theme.
5. Add empty states and onboarding.

---

## 24. MVP Definition of Done

The MVP is done when the user can:

1. Enter a Google Gemini API key.
2. Ask a broad question.
3. Receive a normal AI answer.
4. See 3–7 candidate cards.
5. Drag cards into a visual map.
6. Edit node titles and summaries.
7. Ask follow-up questions from a selected node.
8. Generate a process as ordered steps.
9. Generate options as parallel branches.
10. Keep unrelated topics as separate islands.
11. Refresh the browser and keep the workspace.

---

## 25. Future Roadmap

### V1

1. User account.
2. Subscription.
3. Server-side workspace sync.
4. More models.
5. Export to Markdown.
6. Export to image.
7. File upload.
8. Embedding-based semantic retrieval.
9. Obsidian export.
10. Map version history.

### V2

1. Team collaboration.
2. Shared public maps.
3. AI map refactoring.
4. Literature/PDF mode.
5. Citation-aware research mode.
6. Presentation mode.
7. Storyboard mode.
8. Product-requirement mode.
9. Codebase map mode.
10. Local model support.

---

# Final Product Philosophy

SproutMap AI should not replace ChatGPT.

It should fix the structural weakness of ChatGPT.

The best experience is:

```text
Chat naturally.
Extract carefully.
Map selectively.
Ask locally.
Grow continuously.
```

The map should be a living context system, not a decorative diagram.
