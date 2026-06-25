"use client";

import { useAppStore, type AppEdge } from "@/store/useAppStore";
import { EDGE_RELATIONS, type EdgeRelation } from "@/types/map";

export function EdgeInspector({ edge }: { edge: AppEdge }) {
  const map = edge.data!.map;
  const nodes = useAppStore((s) => s.nodes);
  const updateEdgeData = useAppStore((s) => s.updateEdgeData);
  const deleteEdge = useAppStore((s) => s.deleteEdge);

  const source = nodes.find((n) => n.id === map.source)?.data.map.title ?? map.source;
  const target = nodes.find((n) => n.id === map.target)?.data.map.title ?? map.target;

  return (
    <div className="space-y-3 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Edge
      </span>

      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-2 text-xs">
        <div className="font-medium text-[var(--text-main)]">{source}</div>
        <div className="my-1 text-center text-[var(--primary-dark)]">↓</div>
        <div className="font-medium text-[var(--text-main)]">{target}</div>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
          Relation
        </span>
        <select
          value={map.relation}
          onChange={(e) =>
            updateEdgeData(edge.id, { relation: e.target.value as EdgeRelation })
          }
          className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm outline-none"
        >
          {EDGE_RELATIONS.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
          Label (optional)
        </span>
        <input
          value={map.label ?? ""}
          onChange={(e) => updateEdgeData(edge.id, { label: e.target.value })}
          placeholder="Custom edge label…"
          className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
        />
      </label>

      <button
        onClick={() => deleteEdge(edge.id)}
        className="w-full rounded-md border border-[var(--danger)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--danger)] hover:bg-red-50"
      >
        Delete edge
      </button>
    </div>
  );
}
