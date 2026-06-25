"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { ChatMessage } from "@/types/map";

export function MessageBubble({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming: boolean;
}) {
  const resendFrom = useAppStore((s) => s.resendFrom);
  const isSending = useAppStore((s) => s.isSending);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const isUser = message.role === "user";

  if (isUser && editing) {
    return (
      <div className="ml-6 rounded-2xl rounded-br-md bg-[var(--primary-light)] px-3 py-2">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              setEditing(false);
              resendFrom(message.id, draft);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          rows={2}
          className="w-full resize-none rounded-lg border border-[var(--primary)] bg-white px-2 py-1.5 text-sm outline-none"
        />
        <div className="mt-1.5 flex justify-end gap-1.5">
          <button
            onClick={() => setEditing(false)}
            className="rounded-md px-2 py-1 text-[11px] text-[var(--text-muted)] hover:bg-white/60"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setEditing(false);
              resendFrom(message.id, draft);
            }}
            disabled={!draft.trim() || isSending}
            className="rounded-md bg-[var(--primary-dark)] px-2.5 py-1 text-[11px] font-medium text-white enabled:hover:opacity-90 disabled:opacity-40"
          >
            Save & send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        "group relative " +
        (isUser
          ? "ml-6 rounded-2xl rounded-br-md bg-[var(--primary-light)] px-3 py-2 text-sm text-[var(--text-main)]"
          : "mr-6 rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-main)]")
      }
    >
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {isUser ? "You" : "SproutMap"}
      </div>
      <div className="whitespace-pre-wrap leading-snug">
        {message.content}
        {streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-[var(--primary)]" />
        )}
      </div>

      {isUser && !isSending && (
        <div className="absolute -bottom-2.5 right-2 hidden gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 shadow-sm group-hover:flex">
          <button
            onClick={() => {
              setDraft(message.content);
              setEditing(true);
            }}
            title="Edit this message and resend"
            className="rounded px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
          >
            ✎ Edit
          </button>
          <button
            onClick={() => resendFrom(message.id, message.content)}
            title="Regenerate the response"
            className="rounded px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
          >
            ↻ Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
