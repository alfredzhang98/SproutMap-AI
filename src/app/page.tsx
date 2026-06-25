"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const FEATURES = [
  {
    title: "Chat first",
    body: "Ask anything and get a normal answer — nothing is forced onto the map.",
  },
  {
    title: "Cards, not noise",
    body: "Each answer yields 3–7 atomic candidate cards you choose to keep.",
  },
  {
    title: "Node-scoped follow-ups",
    body: "Select any node and ask again with only the relevant context.",
  },
];

export default function Landing() {
  const router = useRouter();
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const hydrate = useAppStore((s) => s.hydrate);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (apiKey) setDraft(apiKey);
  }, [apiKey]);

  const start = () => {
    if (draft.trim()) setApiKey(draft.trim());
    router.push("/app");
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center">
        <div className="mb-3 text-5xl">🌱</div>
        <h1 className="text-4xl font-bold text-[var(--text-main)]">
          SproutMap AI
        </h1>
        <p className="mt-2 text-lg font-medium text-[var(--primary-dark)]">
          Turn conversations into living maps.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
          A visual AI workspace that converts linear LLM conversations into
          editable cards and a living mind-map — while preserving node-level
          context for focused follow-up questions.
        </p>

        <div className="mt-8 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-soft">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
              Google Gemini API key
            </span>
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && start()}
              placeholder="AIza…"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            />
          </label>
          <button
            onClick={start}
            className="mt-3 w-full rounded-md bg-[var(--primary-dark)] px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Start workspace →
          </button>
          <p className="mt-3 text-[11px] leading-snug text-[var(--text-muted)]">
            Your key is stored only in this browser tab and is never saved or
            logged on the server. Get a free key at{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--primary-dark)] underline"
            >
              Google AI Studio
            </a>
            . You can also skip this and{" "}
            <Link href="/app" className="text-[var(--primary-dark)] underline">
              open the workspace
            </Link>
            .
          </p>
        </div>

        <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left"
            >
              <div className="text-sm font-semibold text-[var(--text-main)]">
                {f.title}
              </div>
              <div className="mt-1 text-xs leading-snug text-[var(--text-muted)]">
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
