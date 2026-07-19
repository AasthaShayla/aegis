/**
 * AI situation briefing via a LOCAL Ollama instance (no key, no cost, private).
 * GET  -> availability probe.
 * POST -> { context } summarized into a short analyst briefing.
 * Gracefully reports unavailable when Ollama isn't running.
 */

import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OLLAMA_MODEL?.trim() || "llama3.2";

async function ollamaUp(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${env.ollamaHost}/api/tags`, { signal: controller.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(): Promise<Response> {
  return Response.json({ available: await ollamaUp(), model: MODEL, host: env.ollamaHost });
}

export async function POST(req: Request): Promise<Response> {
  let context = "";
  try {
    const body = (await req.json()) as { context?: string };
    context = (body.context ?? "").slice(0, 4000);
  } catch {
    /* empty context is fine */
  }

  if (!(await ollamaUp())) {
    return Response.json({ available: false, briefing: null });
  }

  const prompt =
    "You are an OSINT intelligence analyst. Using ONLY the live signals below, write a concise " +
    "3-4 sentence situation briefing of what is notable right now. Be factual and neutral; do not " +
    "invent events. If signals are sparse, say so.\n\nLIVE SIGNALS:\n" +
    context;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 45_000);
    const res = await fetch(`${env.ollamaHost}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, stream: false }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return Response.json({ available: false, briefing: null });
    const data = (await res.json()) as { response?: string };
    return Response.json({ available: true, briefing: (data.response ?? "").trim(), model: MODEL });
  } catch {
    return Response.json({ available: false, briefing: null });
  }
}
