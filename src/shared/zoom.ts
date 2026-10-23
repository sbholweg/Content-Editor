import type { ReelStyle, Word } from "./types";

export type ZoomStyle = ReelStyle["zoomStyle"];

export const ZOOM_STYLES: { value: ZoomStyle; label: string; note: string }[] = [
  { value: "lines", label: "Jump cuts", note: "punch in on every other line" },
  { value: "keywords", label: "Key word punch", note: "zooms in as you say a key word" },
  { value: "push", label: "Slow push-in", note: "a gentle creep in on each line" },
  { value: "crash", label: "Crash zoom", note: "fast and punchy on big words" },
];

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

// How far in the camera is at a moment of the reel (1 = not zoomed), plus a tiny shake angle for
// crash zooms. lines = the start and end of each caption line; words are in finished-reel time.
export function zoomAt(style: ZoomStyle, ms: number, lines: { startMs: number; endMs: number }[], words: Word[]): { scale: number; shake: number } {
  if (style === "push") {
    // The line that started most recently (a new line restarts the push, like a cut).
    const line = [...lines].reverse().find((l) => ms >= l.startMs && ms < l.endMs + 400);
    if (!line) return { scale: 1, shake: 0 };
    return { scale: 1 + 0.08 * Math.min(1, (ms - line.startMs) / Math.max(800, line.endMs - line.startMs)), shake: 0 };
  }
  if (style === "keywords" || style === "crash") {
    const crash = style === "crash";
    // Crash zooms are kept for moments at least 3 seconds apart so they stay special.
    const keys: Word[] = [];
    for (const w of words) {
      if (!w.highlight) continue;
      if (crash && keys.length && w.startMs - keys[keys.length - 1].startMs < 3000) continue;
      keys.push(w);
    }
    const key = [...keys].reverse().find((w) => ms >= w.startMs);
    if (!key) return { scale: 1, shake: 0 };
    const into = ms - key.startMs;
    const hold = Math.max(500, key.endMs - key.startMs + 350);
    const amount = crash ? 0.3 : 0.15;
    const inMs = crash ? 90 : 220;
    const outMs = crash ? 120 : 300;
    const level = into < inMs ? ease(into / inMs) : into < hold ? 1 : 1 - ease((into - hold) / outMs);
    const shake = crash && into < 260 ? Math.sin(into / 18) * 1.4 * (1 - into / 260) : 0;
    return { scale: 1 + amount * Math.max(0, level), shake };
  }
  // "lines": every other line punched in, switching right as the line starts.
  const index = lines.filter((l) => l.startMs <= ms).length - 1;
  return { scale: index % 2 === 1 ? 1.14 : 1, shake: 0 };
}
