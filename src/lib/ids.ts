let counter = 0;

function rand(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Generate a reasonably unique id with an optional prefix. */
export function newId(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${rand()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
