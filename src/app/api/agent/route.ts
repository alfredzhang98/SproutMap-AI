import { NextResponse } from "next/server";
import { isAllowedModel, openGeminiStream } from "@/lib/gemini";
import { DEFAULT_MODEL } from "@/types/llm";
import {
  GENERATE_SCHEMA,
  GENERATE_SYSTEM_PROMPT,
  buildGenerateUserContent,
} from "@/lib/skills/generate";
import { runRefactorSkill } from "@/lib/skills/refactor";
import { runMemorySkill } from "@/lib/skills/memory";
import { runDraftSkill } from "@/lib/skills/draft";
import { runComparisonSkill } from "@/lib/skills/compare";
import type { IntentHeuristicHint } from "@/lib/skills/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  op?: "generate" | "refactor" | "summarize" | "draft" | "compare";
  apiKey?: string;
  model?: string;
  // generate
  contextPayload?: unknown;
  userQuestion?: string;
  hint?: IntentHeuristicHint;
  // refactor
  graphPayload?: unknown;
  userInstruction?: string;
  // summarize
  memoryPayload?: unknown;
  // draft
  text?: string;
  // compare
  question?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Missing Gemini API key." }, { status: 400 });
  }

  const model =
    body.model && isAllowedModel(body.model) ? body.model : DEFAULT_MODEL;
  const op = body.op ?? "generate";

  try {
    if (op === "refactor") {
      const instruction = (body.userInstruction || "").trim();
      if (!instruction) {
        return NextResponse.json(
          { error: "Missing refactor instruction." },
          { status: 400 }
        );
      }
      const data = await runRefactorSkill({
        apiKey,
        model,
        graphPayload: body.graphPayload,
        userInstruction: instruction,
      });
      return NextResponse.json({ data });
    }

    if (op === "summarize") {
      const data = await runMemorySkill({
        apiKey,
        model,
        payload: body.memoryPayload,
      });
      return NextResponse.json({ data });
    }

    if (op === "draft") {
      const text = (body.text || "").trim();
      if (!text) {
        return NextResponse.json({ error: "Missing text." }, { status: 400 });
      }
      const data = await runDraftSkill({ apiKey, model, text });
      return NextResponse.json({ data });
    }

    if (op === "compare") {
      const question = (body.question || "").trim();
      if (!question) {
        return NextResponse.json({ error: "Missing question." }, { status: 400 });
      }
      const data = await runComparisonSkill({ apiKey, model, question });
      return NextResponse.json({ data });
    }

    // default: generate (streamed — answer field first)
    const userQuestion = (body.userQuestion || "").trim();
    if (!userQuestion) {
      return NextResponse.json(
        { error: "Missing user question." },
        { status: 400 }
      );
    }
    const hint: IntentHeuristicHint = body.hint ?? {
      intent: "general_answer",
      preferredMapMode: "none",
      explicitMapCommand: false,
    };

    return await openGeminiStream({
      apiKey,
      model,
      system: GENERATE_SYSTEM_PROMPT,
      user: buildGenerateUserContent(body.contextPayload, userQuestion, hint),
      schema: GENERATE_SCHEMA,
      temperature: 0.5,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reach the model.";
    // Never log the request body or the API key.
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
