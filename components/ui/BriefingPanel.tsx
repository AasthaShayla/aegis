"use client";

import { useCallback, useEffect, useState } from "react";
import { useUiStore } from "@/store/useUiStore";

/** AI situation briefing (local Ollama). Builds a compact context string from
 *  the current signals and asks the server route to summarize it. */
export function BriefingPanel({ context }: { context: string }) {
  const open = useUiStore((s) => s.briefingOpen);
  const setOpen = useUiStore((s) => s.setBriefingOpen);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "unavailable">("idle");
  const [text, setText] = useState("");

  const run = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const j = (await res.json()) as { available: boolean; briefing: string | null };
      if (j.available && j.briefing) {
        setText(j.briefing);
        setState("ok");
      } else {
        setState("unavailable");
      }
    } catch {
      setState("unavailable");
    }
  }, [context]);

  useEffect(() => {
    if (open && state === "idle") run();
  }, [open, state, run]);

  if (!open) return null;

  return (
    <div className="briefing panel">
      <div className="pop-head">
        <span className="ptype">AI briefing</span>
        <span className="ptitle">Situation summary</span>
        <button className="pop-close" onClick={() => setOpen(false)} aria-label="close">
          ×
        </button>
      </div>
      <div className="briefing-body">
        {state === "loading" && <div className="feed-loading">Analyzing live signals…</div>}
        {state === "ok" && <p>{text}</p>}
        {state === "unavailable" && (
          <p className="dim">
            No local AI detected. Install <a href="https://ollama.com" target="_blank" rel="noreferrer">Ollama</a> and
            run a model (e.g. <span className="mono">ollama run llama3.2</span>) to enable private, on-device briefings.
          </p>
        )}
        {state === "ok" && (
          <button className="briefing-refresh" onClick={run}>
            ↻ Refresh
          </button>
        )}
      </div>
    </div>
  );
}
