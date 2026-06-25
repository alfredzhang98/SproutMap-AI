"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { ALLOWED_MODELS, type AllowedModel } from "@/types/llm";

export function ApiKeyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const model = useAppStore((s) => s.model);
  const setModel = useAppStore((s) => s.setModel);

  const [draft, setDraft] = useState(apiKey ?? "");

  useEffect(() => {
    if (open) setDraft(apiKey ?? "");
  }, [open, apiKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--text-main)]">
          Google Gemini API key
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Your key is kept in this browser tab (sessionStorage) and sent only to
          call the Gemini API. It is never stored or logged on the server. Do not
          use this on an untrusted deployment. Get a free key at{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--primary-dark)] underline"
          >
            aistudio.google.com/apikey
          </a>
          .
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
            API key
          </span>
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AIza…"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
            Model
          </span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AllowedModel)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
          >
            {ALLOWED_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => {
              setApiKey(undefined);
              setDraft("");
            }}
            className="text-xs text-[var(--danger)] hover:underline"
          >
            Clear key
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setApiKey(draft.trim() || undefined);
                onClose();
              }}
              className="rounded-md bg-[var(--primary-dark)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
