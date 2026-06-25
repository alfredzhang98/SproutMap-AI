import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractBlockReason,
  extractOutputText,
  geminiGenerateJson,
  isAllowedModel,
} from "@/lib/gemini";

const MODEL = "gemini-3-flash-preview";

function geminiEnvelope(jsonText: string) {
  return {
    candidates: [
      { content: { parts: [{ text: jsonText }] }, finishReason: "STOP" },
    ],
  };
}

function mockFetch(impl: () => unknown) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
}

afterEach(() => vi.restoreAllMocks());

describe("isAllowedModel", () => {
  it("accepts only Gemini 3 / 3.1 models", () => {
    expect(isAllowedModel("gemini-3-flash-preview")).toBe(true);
    expect(isAllowedModel("gemini-3.1-flash-lite")).toBe(true);
    expect(isAllowedModel("gemini-3.1-pro-preview")).toBe(true);
    expect(isAllowedModel("gemini-2.5-flash")).toBe(false);
    expect(isAllowedModel("gpt-4o")).toBe(false);
    expect(isAllowedModel("")).toBe(false);
  });
});

describe("extractOutputText / extractBlockReason", () => {
  it("reads candidates[].content.parts[].text", () => {
    expect(extractOutputText(geminiEnvelope("hi"))).toBe("hi");
  });
  it("reads a flat text field", () => {
    expect(extractOutputText({ text: "yo" })).toBe("yo");
  });
  it("returns null for an empty payload", () => {
    expect(extractOutputText({ candidates: [] })).toBeNull();
  });
  it("detects safety block reasons", () => {
    expect(extractBlockReason({ promptFeedback: { blockReason: "SAFETY" } })).toBe(
      "SAFETY"
    );
    expect(
      extractBlockReason({ candidates: [{ finishReason: "STOP" }] })
    ).toBeNull();
  });
});

describe("geminiGenerateJson", () => {
  it("parses JSON from the Gemini envelope", async () => {
    mockFetch(() => ({
      ok: true,
      json: async () => geminiEnvelope(JSON.stringify({ a: 1, b: "x" })),
    }));
    const res = await geminiGenerateJson<{ a: number; b: string }>({
      apiKey: "k",
      model: MODEL,
      system: "s",
      user: "u",
      schema: {},
    });
    expect(res).toEqual({ a: 1, b: "x" });
  });

  it("throws a user-safe error on a non-ok response", async () => {
    mockFetch(() => ({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: async () => ({ error: { message: "Quota exceeded for the model." } }),
    }));
    await expect(
      geminiGenerateJson({ apiKey: "k", model: MODEL, system: "s", user: "u", schema: {} })
    ).rejects.toThrow(/Quota exceeded/);
  });

  it("throws when the prompt is safety-blocked", async () => {
    mockFetch(() => ({
      ok: true,
      json: async () => ({ promptFeedback: { blockReason: "SAFETY" } }),
    }));
    await expect(
      geminiGenerateJson({ apiKey: "k", model: MODEL, system: "s", user: "u", schema: {} })
    ).rejects.toThrow(/blocked by Gemini: SAFETY/);
  });

  it("throws on malformed JSON output", async () => {
    mockFetch(() => ({ ok: true, json: async () => geminiEnvelope("{nope") }));
    await expect(
      geminiGenerateJson({ apiKey: "k", model: MODEL, system: "s", user: "u", schema: {} })
    ).rejects.toThrow(/malformed JSON/);
  });

  it("sends the key via x-goog-api-key to the model endpoint", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => geminiEnvelope(JSON.stringify({ ok: true })),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await geminiGenerateJson({
      apiKey: "secret",
      model: MODEL,
      system: "s",
      user: "u",
      schema: {},
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain(`${MODEL}:generateContent`);
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("secret");
  });
});
