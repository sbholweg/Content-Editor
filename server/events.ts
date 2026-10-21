import type { Request, Response } from "express";

export type EngineEvent = { type: "project"; id: string; rev: number } | { type: "project-deleted"; id: string } | { type: "brand" };

const listeners = new Set<Response>();

// Server-sent events: open editors hear about changes made elsewhere (for example by Claude
// running the engine commands) and refresh without a reload.
export function subscribe(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(": connected\n\n");
  listeners.add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000);
  req.on("close", () => {
    clearInterval(ping);
    listeners.delete(res);
  });
}

export function broadcast(event: EngineEvent) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of listeners) res.write(line);
}
