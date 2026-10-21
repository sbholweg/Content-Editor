import type { Overlay, Word } from "./types";

// Works out when each overlay is on screen in the cut video: from the first kept word in its
// range to the last one. Overlays whose words were all cut are dropped.
export function overlayTimes<T extends Overlay>(overlays: T[], words: Word[], outputWords: Word[]) {
  const outById = new Map(outputWords.map((w) => [w.id, w]));
  const index = new Map(words.map((w, i) => [w.id, i]));
  return overlays.flatMap((o) => {
    const a = index.get(o.startWordId);
    const b = index.get(o.endWordId);
    if (a === undefined || b === undefined) return [];
    const kept = words.slice(Math.min(a, b), Math.max(a, b) + 1).flatMap((w) => outById.get(w.id) ?? []);
    if (kept.length === 0) return [];
    return [{ overlay: o, startMs: kept[0].startMs, endMs: Math.max(kept[kept.length - 1].endMs, kept[0].startMs + 600) }];
  });
}
