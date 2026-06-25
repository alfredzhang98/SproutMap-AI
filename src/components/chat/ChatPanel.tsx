"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { buildContextPayload, type ContextMode } from "@/lib/context";
import { CandidateCardTray } from "./CandidateCardTray";
import { MapPatchPreview } from "./MapPatchPreview";
import { AutomationBanner } from "./AutomationBanner";
import { MessageBubble } from "./MessageBubble";

const CONTEXT_OPTIONS: { value: ContextMode; label: string }[] = [
  { value: "global", label: "Global" },
  { value: "selected_node", label: "Node" },
  { value: "selected_subtree", label: "Subtree" },
  { value: "selected_island", label: "Island" },
];

export function ChatPanel() {
  const messages = useAppStore((s) => s.messages);
  const isSending = useAppStore((s) => s.isSending);
  const streamingMessageId = useAppStore((s) => s.streamingMessageId);
  const error = useAppStore((s) => s.error);
  const contextMode = useAppStore((s) => s.contextMode);
  const setContextMode = useAppStore((s) => s.setContextMode);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const clearError = useAppStore((s) => s.clearError);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const nodes = useAppStore((s) => s.nodes);
  const apiKey = useAppStore((s) => s.apiKey);

  const edges = useAppStore((s) => s.edges);
  const messagesForCtx = useAppStore((s) => s.messages);
  const workspaceTitle = useAppStore((s) => s.workspaceTitle);

  const [input, setInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : undefined;

  const contextPreview = useMemo(() => {
    if (!showPreview) return null;
    return buildContextPayload({
      workspace: {
        workspaceTitle,
        nodes: nodes.map((n) => n.data.map),
        edges: edges.map((e) => e.data!.map),
        messages: messagesForCtx,
      },
      selectedNodeId,
      contextMode,
      userQuestion: input,
    });
  }, [
    showPreview,
    workspaceTitle,
    nodes,
    edges,
    messagesForCtx,
    selectedNodeId,
    contextMode,
    input,
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isSending]);

  const submit = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    await sendMessage(text);
  };

  const scopeHint =
    contextMode !== "global" && selectedNode
      ? `Asking from “${selectedNode.data.map.title}”`
      : contextMode === "global"
      ? "Asking with global context"
      : "No node selected — will use root context";

  return (
    <div className="flex h-full flex-col">
      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
            <div className="mb-1 font-semibold text-[var(--text-main)]">
              Start a conversation
            </div>
            Describe a broad topic. SproutMap will answer normally and propose a
            few cards you can drag onto the map.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            streaming={m.id === streamingMessageId}
          />
        ))}
        {isSending && !streamingMessageId && (
          <div className="mr-6 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-muted)]">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary)] [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary)] [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary)]" />
            </span>
            Thinking…
          </div>
        )}
      </div>

      {error && (
        <div className="mx-3 mb-2 flex items-start justify-between gap-2 rounded-md border border-[var(--danger)] bg-red-50 px-3 py-2 text-xs text-[var(--danger)]">
          <span>{error}</span>
          <button onClick={clearError} className="font-bold">
            ✕
          </button>
        </div>
      )}

      <AutomationBanner />
      <MapPatchPreview />
      <CandidateCardTray />

      {/* Composer */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="mb-2 flex items-center gap-1">
          <span className="text-[10px] text-[var(--text-muted)]">Context:</span>
          <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
            {CONTEXT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setContextMode(opt.value)}
                className={
                  "px-2 py-1 text-[10px] transition " +
                  (contextMode === opt.value
                    ? "bg-[var(--primary)] font-medium text-[var(--primary-dark)]"
                    : "bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={
              "ml-auto rounded-md border px-2 py-1 text-[10px] transition " +
              (showPreview
                ? "border-[var(--primary)] bg-[var(--surface-soft)] text-[var(--primary-dark)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]")
            }
            title="Preview what context this question will use"
          >
            Preview context
          </button>
        </div>

        {contextPreview && (
          <div className="mb-2 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
            <div className="mb-0.5 font-semibold text-[var(--text-main)]">
              This question will use:
            </div>
            <div>· Mode: {contextPreview.contextMode.replace(/_/g, " ")}</div>
            {contextPreview.selectedPath.length > 0 && (
              <div>· Path: {contextPreview.selectedPath.join(" › ")}</div>
            )}
            <div>
              · {contextPreview.childrenSummaries.length} children,{" "}
              {contextPreview.siblingSummaries.length} siblings
              {contextPreview.subtreeSummaries
                ? `, ${contextPreview.subtreeSummaries.length} subtree`
                : ""}
              {contextPreview.islandSummaries
                ? `, ${contextPreview.islandSummaries.length} island`
                : ""}
            </div>
            <div>· {contextPreview.recentMessages.length} recent messages</div>
            <div>· Map index: {contextPreview.globalMapIndex.length} nodes</div>
          </div>
        )}

        <div className="mb-1.5 text-[10px] text-[var(--text-muted)]">{scopeHint}</div>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder={
              apiKey ? "Ask anything…" : "Add your API key to start…"
            }
            className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={submit}
            disabled={isSending || !input.trim()}
            className="rounded-lg bg-[var(--primary-dark)] px-3 py-2 text-sm font-medium text-white enabled:hover:opacity-90 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
