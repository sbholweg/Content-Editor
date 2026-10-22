import type { Word } from "./types";

export type Segment = { startMs: number; endMs: number };

// Tuned for fast-paced talking reels: any gap longer than a breath is trimmed to a short beat.
const CUT_PAD_MS = 50;
const PAUSE_THRESHOLD_MS = 220;
const PAUSE_KEEP_MS = 80;
const EDGE_KEEP_MS = 100;
// Quiet stretches found in the audio itself (more accurate than gaps between transcribed words,
// whose timings often run into the silence).
const SILENCE_MIN_MS = 260;
const SILENCE_KEEP_MS = 70;

// Works out which parts of the original video to keep, given the words that were cut
// and whether long pauses should be removed. Both the preview and the export use this.
export function buildTimeline(words: Word[], durationMs: number, removePauses: boolean, silences: Segment[] = []) {
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
    for (const q of silences) {
      if (q.endMs - q.startMs >= SILENCE_MIN_MS) removed.push({ startMs: q.startMs + SILENCE_KEEP_MS, endMs: q.endMs - SILENCE_KEEP_MS });
    }
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

// The moment in the original video that a time in the cut reel comes from.
export function toOriginalMs(segments: Segment[], outputMs: number) {
  let offset = 0;
  for (const s of segments) {
    const len = s.endMs - s.startMs;
    if (outputMs < offset + len) return s.startMs + (outputMs - offset);
    offset += len;
  }
  return segments.at(-1)?.endMs ?? 0;
}
