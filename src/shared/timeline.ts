import type { Word } from "./types";

export type Segment = { startMs: number; endMs: number };

const CUT_PAD_MS = 60;
const PAUSE_THRESHOLD_MS = 400;
const PAUSE_KEEP_MS = 120;
const EDGE_KEEP_MS = 150;

// Works out which parts of the original video to keep, given the words that were cut
// and whether long pauses should be removed. Both the preview and the export use this.
export function buildTimeline(words: Word[], durationMs: number, removePauses: boolean) {
  const kept = words.filter((w) => !w.cut);
  const removed: Segment[] = [];

  if (kept.length === 0) {
    return { segments: [{ startMs: 0, endMs: durationMs }], words: [] as Word[], durationMs };
  }

  // Remove each run of cut words together with the gap around it.
  for (let i = 0; i < words.length; i++) {
    if (!words[i].cut) continue;
    let j = i;
    while (j + 1 < words.length && words[j + 1].cut) j++;
    const before = words.slice(0, i).reverse().find((w) => !w.cut);
    const after = words.slice(j + 1).find((w) => !w.cut);
    const start = before ? before.endMs + CUT_PAD_MS : 0;
    const end = after ? after.startMs - CUT_PAD_MS : durationMs;
    if (end > start) removed.push({ startMs: start, endMs: end });
    i = j;
  }

  if (removePauses) {
    const first = kept[0];
    const last = kept[kept.length - 1];
    if (first.startMs > EDGE_KEEP_MS * 2) removed.push({ startMs: 0, endMs: first.startMs - EDGE_KEEP_MS });
    for (let i = 0; i < kept.length - 1; i++) {
      const gap = kept[i + 1].startMs - kept[i].endMs;
      if (gap > PAUSE_THRESHOLD_MS) {
        removed.push({ startMs: kept[i].endMs + PAUSE_KEEP_MS, endMs: kept[i + 1].startMs - PAUSE_KEEP_MS });
      }
    }
    if (durationMs - last.endMs > EDGE_KEEP_MS * 2) removed.push({ startMs: last.endMs + EDGE_KEEP_MS, endMs: durationMs });
  }

  // Merge overlapping removals, then keep everything in between.
  removed.sort((a, b) => a.startMs - b.startMs);
  const merged: Segment[] = [];
  for (const r of removed) {
    const prev = merged[merged.length - 1];
    if (prev && r.startMs <= prev.endMs) prev.endMs = Math.max(prev.endMs, r.endMs);
    else merged.push({ ...r });
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const r of merged) {
    if (r.startMs - cursor > 40) segments.push({ startMs: cursor, endMs: r.startMs });
    cursor = Math.max(cursor, r.endMs);
  }
  if (durationMs - cursor > 40) segments.push({ startMs: cursor, endMs: durationMs });

  // Shift each kept word to where it lands in the shortened video.
  const toOutput = (ms: number) => {
    let offset = 0;
    for (const s of segments) {
      if (ms < s.startMs) return offset;
      if (ms <= s.endMs) return offset + (ms - s.startMs);
      offset += s.endMs - s.startMs;
    }
    return offset;
  };
  const outWords = kept.map((w) => ({ ...w, startMs: toOutput(w.startMs), endMs: toOutput(w.endMs) }));
  const outDuration = segments.reduce((sum, s) => sum + (s.endMs - s.startMs), 0);

  return { segments, words: outWords, durationMs: Math.max(outDuration, 100) };
}
