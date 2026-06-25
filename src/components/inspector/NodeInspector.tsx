"use client";

import { useAppStore, type AppNode } from "@/store/useAppStore";
import { NODE_TYPES, type NodeType } from "@/types/map";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function NodeInspector({ node }: { node: AppNode }) {
  const map = node.data.map;
  const updateNodeData = useAppStore((s) => s.updateNodeData);
  const deleteNode = useAppStore((s) => s.deleteNode);
  const addManualChild = useAppStore((s) => s.addManualChild);
  const setContextMode = useAppStore((s) => s.setContextMode);
  const setSelectedNode = useAppStore((s) => s.setSelectedNode);
  const summarizeNode = useAppStore((s) => s.summarizeNode);
  const runRefactor = useAppStore((s) => s.runRefactor);
  const messages = useAppStore((s) => s.messages);

  const sources = messages.filter((m) => map.sourceMessageIds.includes(m.id));

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Node
        </span>
        <select
          value={map.type}
          onChange={(e) =>
            updateNodeData(node.id, { type: e.target.value as NodeType })
          }
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-[11px] outline-none"
        >
          {NODE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <Field label="Title">
        <input
          value={map.title}
          onChange={(e) => updateNodeData(node.id, { title: e.target.value })}
          className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm font-semibold outline-none focus:border-[var(--primary)]"
        />
      </Field>

      <Field label="One-line summary">
        <input
          value={map.oneLineSummary}
          onChange={(e) =>
            updateNodeData(node.id, { oneLineSummary: e.target.value })
          }
          className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
        />
      </Field>

      <Field label="Detail summary">
        <textarea
          value={map.detailSummary ?? ""}
          onChange={(e) =>
            updateNodeData(node.id, { detailSummary: e.target.value })
          }
          rows={4}
          className="w-full resize-y rounded border border-[var(--border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
        />
      </Field>

      <Field label="User notes">
        <textarea
          value={map.userNotes ?? ""}
          onChange={(e) =>
            updateNodeData(node.id, { userNotes: e.target.value })
          }
          rows={3}
          placeholder="Your private notes for this node…"
          className="w-full resize-y rounded border border-[var(--border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
        />
      </Field>

      {map.openQuestions && map.openQuestions.length > 0 && (
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
            Open questions
          </span>
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-[var(--text-main)]">
            {map.openQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {map.decisionLog && map.decisionLog.length > 0 && (
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
            Decision log
          </span>
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-[var(--text-main)]">
            {map.decisionLog.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {sources.length > 0 && (
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
            Source messages
          </span>
          <div className="space-y-1">
            {sources.map((m) => (
              <div
                key={m.id}
                className="rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-[11px] text-[var(--text-muted)]"
              >
                <span className="font-medium">{m.role}:</span>{" "}
                {m.content.slice(0, 120)}
                {m.content.length > 120 ? "…" : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <input
          type="checkbox"
          checked={!!map.isLocked}
          onChange={(e) => updateNodeData(node.id, { isLocked: e.target.checked })}
        />
        Lock title (prevents AI overwrite)
      </label>

      <div className="space-y-2 border-t border-[var(--border)] pt-3">
        <button
          onClick={() => {
            setSelectedNode(node.id);
            setContextMode("selected_node");
          }}
          className="w-full rounded-md bg-[var(--primary-dark)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Ask from this node
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => summarizeNode(node.id)}
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
            title="Re-summarize this node with AI (updates memory)"
          >
            Re-summarize
          </button>
          <button
            onClick={() =>
              runRefactor(`Reorganize the subtree under "${map.title}" to be clearer.`)
            }
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
            title="Propose a cleanup patch for this branch"
          >
            Tidy branch
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => addManualChild(node.id)}
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
          >
            + Add child
          </button>
          <button
            onClick={() => deleteNode(node.id)}
            className="flex-1 rounded-md border border-[var(--danger)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--danger)] hover:bg-red-50"
          >
            Delete node
          </button>
        </div>
      </div>
    </div>
  );
}
