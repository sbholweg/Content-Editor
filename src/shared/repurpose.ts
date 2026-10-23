import { plainHook } from "./hookText";
import { buildLines, isLineCut } from "./lines";
import type { BrandKit, Project, Slide, SlideFormat } from "./types";

const ORDINALS = ["one", "two", "three", "four", "five", "six"];
const clean = (t: string) => t.replace(/[.,!?;:]+$/, "");

// A first draft of carousel slides or story frames from the reel's own words. Claude (or the
// creator) can rewrite any of it; this just gives a sensible starting point without AI.
export function draftSlides(project: Project, brand: BrandKit, format: SlideFormat): Slide[] {
  const lines = buildLines(project.words).filter((l) => !isLineCut(l));
  const textOf = (l: (typeof lines)[number]) => l.words.filter((w) => !w.cut).map((w) => w.text).join(" ");
  const keyOf = (l: (typeof lines)[number]) => l.words.filter((w) => w.highlight && !w.cut).map((w) => clean(w.text));
  const id = (n: number) => `${format}-${Date.now()}-${n}`;
  const hook = plainHook(project.hookText) || (lines[0] ? textOf(lines[0]) : "");
  const cta = brand.ctaKeywords[0] || brand.business.cta || "Save this for later";
  const first = lines[0]?.words.find((w) => !w.cut)?.startMs ?? 0;

  // The lines with the most key words make the best points.
  const points = lines
    .slice(1)
    .map((l) => ({ l, keys: keyOf(l) }))
    .filter((x) => x.keys.length)
    .sort((a, b) => b.keys.length - a.keys.length)
    .slice(0, format === "carousel" ? 5 : 1)
    .sort((a, b) => a.l.words[0].startMs - b.l.words[0].startMs);

  if (format === "stories") {
    const p = points[0];
    return [
      { id: id(0), kind: "cover", eyebrow: "new reel", title: hook, body: "tap the post to watch", pills: [], frameMs: first },
      ...(p
        ? [{ id: id(1), kind: "point" as const, eyebrow: "the short version:", title: p.keys.slice(0, 3).join(" "), body: textOf(p.l), pills: [], frameMs: p.l.words[0].startMs }]
        : []),
      { id: id(2), kind: "cta", eyebrow: "", title: "new post", body: cta, pills: [], frameMs: lines.at(-1)?.words[0].startMs ?? first },
    ];
  }

  return [
    { id: id(0), kind: "cover", eyebrow: "", title: hook, body: "", pills: [], frameMs: first },
    ...points.map(({ l, keys }, i) => ({
      id: id(i + 1),
      kind: "point" as const,
      eyebrow: `${points.length > 1 ? `${ORDINALS[i] ?? i + 1}: ` : ""}`,
      title: keys.slice(0, 2).join(" "),
      body: textOf(l),
      pills: [],
      frameMs: l.words[0].startMs,
    })),
    { id: id(99), kind: "cta", eyebrow: "if this helped", title: "save it", body: cta, pills: [], frameMs: lines.at(-1)?.words[0].startMs ?? first },
  ];
}
