import type { Project, SoundCue } from "./types";

// Words that mean the creator is talking about money (a "money moment").
const MONEY = /^\$|\$$|^(price|prices|pricing|priced|sale|sales|saving|savings|save|saved|income|revenue|paid|pay|payment|money|cash|invoice|invoices|profit|profits|dollars?|budget|cost|costs|earn|earned|earning|earnings|rate|rates|retainer|salary|raise|\d+k)$/i;

const clean = (t: string) => t.replace(/[.,!?;:"“”'’()]/g, "");

// Picks sound effects for a reel by moment, the way popular creators do:
// a click on key words popping up, a pop on stickers and emojis,
// a camera shutter when a screenshot or photo appears, and a cash register on money moments.
// Keeps sounds apart so they never pile up, and leaves sounds already on the reel alone.
export function autoSounds(reel: Pick<Project, "words" | "overlays" | "sounds" | "hookText">, assets: { id: string; kind: string }[]): SoundCue[] {
  const words = reel.words.filter((w) => !w.cut);
  const cues: SoundCue[] = [...reel.sounds];
  const startOf = new Map(reel.words.map((w) => [w.id, w.startMs]));
  const kept = new Set(words.map((w) => w.id));
  const apart = (a: string, b: string) => Math.abs((startOf.get(a) ?? -1e9) - (startOf.get(b) ?? 1e9));
  // At least 0.6s from any other sound, and further from sounds of the same kind so they don't repeat too often.
  const add = (wordId: string, soundId: string, volume = 0.7, sameKind: string[] = [], sameKindGapMs = 0) => {
    const crowded = cues.some((c) => apart(c.wordId, wordId) < (sameKind.includes(c.soundId) ? sameKindGapMs : 600));
    if (kept.has(wordId) && !crowded) cues.push({ id: `snd-${Date.now()}-${cues.length}`, wordId, soundId, volume });
  };
  const MONEY_SOUNDS = ["sfx-cha-ching", "sfx-coins-clinking"];
  const CLICKS = ["sfx-click", "sfx-mouse-double"];

  // Strongest moments first, so they win when two land close together.
  // (No whoosh on the first word: it lands right on top of the opening line.)
  for (const o of reel.overlays) {
    const kind = assets.find((a) => a.id === o.assetId)?.kind;
    if (o.graphic && ["circle", "arrow", "underline"].includes(o.graphic.kind)) add(o.startWordId, "sfx-marker", 0.7);
    else if (o.placement === "full") add(o.startWordId, "sfx-swoosh-in", 0.6);
    else if (kind === "image") add(o.startWordId, "sfx-shutter-2", 0.8);
    else add(o.startWordId, "sfx-pop-cartoon", 0.7);
  }

  let money = 0;
  for (const w of words) {
    if (!MONEY.test(clean(w.text))) continue;
    add(w.id, money++ % 2 ? "sfx-coins-clinking" : "sfx-cha-ching", 0.7, MONEY_SOUNDS, 3000);
  }

  for (const w of words) if (w.emoji) add(w.id, "sfx-pop-cartoon", 0.6);

  // Key words "popping up": a soft click, spaced out so it doesn't get busy.
  let clicks = 0;
  for (const w of words) if (w.highlight) add(w.id, clicks++ % 2 ? "sfx-mouse-double" : "sfx-click", 0.5, CLICKS, 2500);

  return cues;
}
