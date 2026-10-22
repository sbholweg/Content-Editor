import type { Word } from "./types";

// Filler words that "Cut ums & uhs" removes.
export const FILLER = /^(u+m+|u+h+|uhm+|erm+|hmm+|mm+|ah+)[,.!?]*$/i;

export const isFiller = (text: string) => FILLER.test(text.trim());

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9']/g, "");

// Finds retakes: repeated phrases ("I was, I was going") and sentences the speaker restarted
// ("So the first thing… So the first thing you do is"). Returns the ids of the earlier takes,
// so the last, cleanest take is kept.
export function findRetakes(words: Word[]): Set<string> {
  const cut = new Set<string>();
  const kept = words.filter((w) => !w.cut);
  const t = kept.map((w) => norm(w.text));

  // Stutters and immediate repeats of 1-5 words.
  for (let i = 0; i < kept.length; i++) {
    for (let n = 5; n >= 1; n--) {
      if (i + 2 * n > kept.length) continue;
      const a = t.slice(i, i + n).join(" ");
      const b = t.slice(i + n, i + 2 * n).join(" ");
      // Single repeated short words like "very very" can be deliberate; only cut if 2+ letters and not emphasis words.
      if (a && a === b && (n > 1 || !["very", "so", "really", "no", "yes", "ha"].includes(a))) {
        for (let k = i; k < i + n; k++) cut.add(kept[k].id);
        i += n - 1;
        break;
      }
    }
  }

  // Restarted sentences: a phrase whose opening words come again shortly after.
  const sentences: Word[][] = [];
  let cur: Word[] = [];
  kept.forEach((w, i) => {
    cur.push(w);
    const next = kept[i + 1];
    if (/[.!?]$/.test(w.text.trim()) || (next && next.startMs - w.endMs > 600)) {
      sentences.push(cur);
      cur = [];
    }
  });
  if (cur.length) sentences.push(cur);

  for (let i = 0; i < sentences.length; i++) {
    const a = sentences[i].map((w) => norm(w.text));
    for (let j = i + 1; j <= i + 2 && j < sentences.length; j++) {
      const b = sentences[j].map((w) => norm(w.text));
      let same = 0;
      while (same < a.length && same < b.length && a[same] === b[same]) same++;
      // Same first 3 words (or the whole short fragment) means the speaker started over.
      if (same >= 3 || (same >= 2 && same === a.length) || (same >= 2 && a.length <= 4)) {
        for (let k = i; k < j; k++) sentences[k].forEach((w) => cut.add(w.id));
        break;
      }
    }
  }
  return cut;
}

// The standard clean-up for a talking reel: ums, repeats and restarted sentences.
export function tighten(words: Word[]): Word[] {
  const retakes = findRetakes(words);
  return words.map((w) => (isFiller(w.text) || retakes.has(w.id) ? { ...w, cut: true } : w));
}
