"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

function MatrixView() {
  const result = useAppStore((s) => s.lastComparison);
  const addComparisonToMap = useAppStore((s) => s.addComparisonToMap);
  const clearComparison = useAppStore((s) => s.clearComparison);
  if (!result) return null;

  const cell = (option: string, criterion: string) =>
    result.cells.find((c) => c.option === option && c.criterion === criterion);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-[var(--text-main)]">{result.title}</div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[var(--surface-soft)]">
              <th className="border-b border-[var(--border)] px-2 py-1.5 text-left font-semibold">
                Option
              </th>
              {result.criteria.map((cr) => (
                <th
                  key={cr.name}
                  className="border-b border-l border-[var(--border)] px-2 py-1.5 text-left font-semibold"
                >
                  {cr.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.options.map((o) => (
              <tr key={o.name}>
                <td className="border-b border-[var(--border)] px-2 py-1.5 align-top">
                  <div className="font-medium text-[var(--text-main)]">{o.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{o.summary}</div>
                </td>
                {result.criteria.map((cr) => {
                  const c = cell(o.name, cr.name);
                  return (
                    <td
                      key={cr.name}
                      title={c?.note}
                      className="border-b border-l border-[var(--border)] px-2 py-1.5 align-top text-[var(--text-main)]"
                    >
                      {c?.rating ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.recommendation && (
        <div className="rounded-lg border border-[var(--primary)] bg-[var(--primary-light)] px-3 py-2 text-[12px] text-[var(--text-main)]">
          <span className="font-semibold">Recommendation: </span>
          {result.recommendation}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => addComparisonToMap(result)}
          className="rounded-md bg-[var(--primary-dark)] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
        >
          Add to map
        </button>
        <button
          onClick={clearComparison}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
        >
          New comparison
        </button>
      </div>
    </div>
  );
}

export function GenerateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"text" | "compare">("text");
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");

  const draftFromText = useAppStore((s) => s.draftFromText);
  const isDrafting = useAppStore((s) => s.isDrafting);
  const runComparison = useAppStore((s) => s.runComparison);
  const isComparing = useAppStore((s) => s.isComparing);
  const lastComparison = useAppStore((s) => s.lastComparison);
  const error = useAppStore((s) => s.error);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex gap-1 rounded-lg bg-[var(--surface-soft)] p-0.5">
            <button
              onClick={() => setTab("text")}
              className={
                "rounded-md px-3 py-1.5 text-xs font-medium transition " +
                (tab === "text"
                  ? "bg-[var(--surface)] text-[var(--text-main)] shadow-sm"
                  : "text-[var(--text-muted)]")
              }
            >
              From long text
            </button>
            <button
              onClick={() => setTab("compare")}
              className={
                "rounded-md px-3 py-1.5 text-xs font-medium transition " +
                (tab === "compare"
                  ? "bg-[var(--surface)] text-[var(--text-main)] shadow-sm"
                  : "text-[var(--text-muted)]")
              }
            >
              Comparison matrix
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-md border border-[var(--danger)] bg-red-50 px-3 py-2 text-xs text-[var(--danger)]">
              {error}
            </div>
          )}

          {tab === "text" ? (
            <>
              <p className="text-xs text-[var(--text-muted)]">
                Paste an article, notes, or a transcript. SproutMap drafts a layered
                map (≤5 branches, ≤5 points each). It is marked as a draft — refine,
                simplify, or collapse afterwards.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder="Paste your text here…"
                className="w-full resize-y rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
              />
              <button
                onClick={async () => {
                  await draftFromText(text);
                  if (!useAppStore.getState().error) onClose();
                }}
                disabled={isDrafting || !text.trim()}
                className="rounded-md bg-[var(--primary-dark)] px-3 py-2 text-sm font-medium text-white enabled:hover:opacity-90 disabled:opacity-40"
              >
                {isDrafting ? "Generating draft…" : "Generate draft map"}
              </button>
            </>
          ) : lastComparison ? (
            <MatrixView />
          ) : (
            <>
              <p className="text-xs text-[var(--text-muted)]">
                Describe what to compare. SproutMap builds an options × criteria
                matrix with a recommendation, which you can add to the map.
              </p>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runComparison(question)}
                placeholder="e.g. Compare Notion, Obsidian and Heptabase for research"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
              />
              <button
                onClick={() => runComparison(question)}
                disabled={isComparing || !question.trim()}
                className="rounded-md bg-[var(--primary-dark)] px-3 py-2 text-sm font-medium text-white enabled:hover:opacity-90 disabled:opacity-40"
              >
                {isComparing ? "Building matrix…" : "Build comparison"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
