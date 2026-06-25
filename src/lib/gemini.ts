import { ALLOWED_MODELS } from "@/types/llm";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function isAllowedModel(model: string): boolean {
  return (ALLOWED_MODELS as readonly string[]).includes(model);
}

type GeminiJsonArgs = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  /** OpenAPI-3.0-subset schema for Gemini `responseSchema`. */
  schema: unknown;
  temperature?: number;
};

/**
 * Low-level Gemini `generateContent` call that forces JSON output and returns
 * the parsed object. This is the single network primitive every LLM skill is
 * built on. The API key is never logged or persisted here.
 */
export async function geminiGenerateJson<T>({
  apiKey,
  model,
  system,
  user,
  schema,
  temperature = 0.5,
}: GeminiJsonArgs): Promise<T> {
  const res = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
        },
      }),
    }
  );

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || detail;
    } catch {
      /* ignore parse error */
    }
    throw new Error(detail);
  }

  const data = await res.json();

  const blocked = extractBlockReason(data);
  if (blocked) throw new Error(`Request blocked by Gemini: ${blocked}`);

  const text = extractOutputText(data);
  if (!text) throw new Error("Model returned an empty response.");

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Model returned malformed JSON.");
  }
}

type GeminiStreamArgs = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  schema: unknown;
  temperature?: number;
};

/**
 * Open a streaming Gemini call and return a web Response that emits the model's
 * text deltas as plain text (the JSON being generated, answer-field first).
 * Throws (with a user-safe message) if the upstream request fails before
 * streaming starts. The API key is never logged.
 */
export async function openGeminiStream({
  apiKey,
  model,
  system,
  user,
  schema,
  temperature = 0.5,
}: GeminiStreamArgs): Promise<Response> {
  const upstream = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
        },
      }),
    }
  );

  if (!upstream.ok || !upstream.body) {
    let detail = `${upstream.status} ${upstream.statusText}`;
    try {
      const errJson = await upstream.json();
      detail = errJson?.error?.message || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              const text = extractOutputText(obj);
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              /* skip non-JSON keepalive lines */
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

/** Extract text from a Gemini generateContent payload across shape variations. */
export function extractOutputText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const candidates = d.candidates as unknown;
  if (Array.isArray(candidates) && candidates.length) {
    const content = (candidates[0] as Record<string, unknown>)?.content as
      | Record<string, unknown>
      | undefined;
    const parts = content?.parts as unknown;
    if (Array.isArray(parts)) {
      const joined = parts
        // Gemini 3 streams reasoning as `thought: true` parts — exclude them so
        // the accumulated text stays valid JSON.
        .filter((p) => (p as Record<string, unknown>)?.thought !== true)
        .map((p) => (p as Record<string, unknown>)?.text)
        .filter((t): t is string => typeof t === "string")
        .join("");
      if (joined) return joined;
    }
  }

  if (typeof d.text === "string" && d.text.length > 0) return d.text;
  return null;
}

/** Detect prompt/safety blocking so we can surface a clear message. */
export function extractBlockReason(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const feedback = d.promptFeedback as Record<string, unknown> | undefined;
  if (feedback?.blockReason) return String(feedback.blockReason);
  const candidates = d.candidates as unknown;
  if (Array.isArray(candidates) && candidates.length) {
    const reason = (candidates[0] as Record<string, unknown>)?.finishReason;
    if (reason && reason !== "STOP" && reason !== "MAX_TOKENS") {
      return String(reason);
    }
  }
  return null;
}

// ── Shared Gemini schema fragments (OpenAPI-3.0 subset; no additionalProperties) ──

export const NODE_TYPE_ENUM = [
  "topic",
  "concept",
  "method",
  "step",
  "question",
  "decision",
  "evidence",
  "risk",
  "example",
  "tool",
  "agent",
  "workflow",
  "metric",
];

export const RELATION_ENUM = [
  "contains",
  "part_of",
  "next_step",
  "option_of",
  "supports",
  "contradicts",
  "relates_to",
  "derived_from",
  "unresolved_question",
];
