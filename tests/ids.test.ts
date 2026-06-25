import { describe, expect, it } from "vitest";
import { newId, nowIso } from "@/lib/ids";

describe("ids", () => {
  it("generates unique ids with the given prefix", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(newId("node"));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id.startsWith("node_")).toBe(true);
  });

  it("defaults the prefix to 'id'", () => {
    expect(newId().startsWith("id_")).toBe(true);
  });

  it("nowIso returns a valid ISO timestamp", () => {
    const iso = nowIso();
    expect(new Date(iso).toISOString()).toBe(iso);
  });
});
