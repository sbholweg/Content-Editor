import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Word } from "../src/shared/types.ts";
import { askClaudeCodeJson } from "./claude-cli.ts";
import { config } from "./config.ts";

const CutPlan = z.object({
  cuts: z
    .array(z.object({ from: z.number().int(), to: z.number().int(), why: z.string() }))
    .describe("Ranges of word numbers to remove, inclusive"),
});

const SYSTEM = `You are the editor of a fast, polished Instagram/TikTok talking reel. You receive the raw footage of one recording as numbered words, with long gaps shown as (pause 1.4s). Creators film the way they talk: they try a line several times, re-record whole passages, ramble, and repeat points. Your job is to decide which words to cut so the finished reel sounds like they said the best version once, smoothly, start to finish.

How this creator edits (learned from their own before/after):
- Multiple takes of a line: keep only the LAST complete take, cut every earlier attempt. The later take always wins, even if the earlier one looks fine: they re-recorded because they weren't happy with it ("But a couple things happened…" then "Then a couple things happened…" -> keep "Then…"). ("I used to pride myself on… you… I used to pride myself on… I used to pride myself on being a jack of all trades in my business, and it actually cost me a lot of money." -> keep only that last full sentence.)
- Sentences marked ⟨said again later from word N⟩ were re-recorded: cut the earlier one unless the later one is clearly broken.
- Re-recorded passages: if they explain the same point twice, even a minute or more apart, keep the later, tighter version and cut the earlier one entirely.
- Stumbles inside a sentence: "they don't really, they don't really think of you" -> "they don't really think of you". "Like when someone asked, like, when someone asked what I did" -> keep the second.
- Trim for length, not just mistakes. When two stretches make the same point, keep the one with the concrete story or example and cut the abstract restatement ("just because you can do something doesn't mean you should sell it…" when the story already showed it). Keep concrete examples, specific scenarios and vivid details; cut generic summaries, lists of extra consequences and lessons stated twice.
- Keep the punchy, sassy emphasis lines: they're the creator's personality ("Like, that is how they're going to treat you." "Like I'm really good at it."). Keep the hook, the story, the turning point, the lesson and the call to action. A rambling 10-minute recording typically becomes about 3 minutes; a short clean recording may barely change. Be decisive.
- Cut filler that adds nothing (um, uh, you know, I mean, kind of, sort of, okay so), talking to themselves ("wait", "let me start over", "is this recording"), and non-speech in brackets like (cough) or [laughs].
- Start at the first clean take of the hook. End right after the call to action.
- Keep their personality: swearing, jokes, sass and emphasis stay ("I'm the fucking queen at this").

Never:
- Change their meaning, cut a punchline, a number, the core lesson, or their call to action.
- Leave a sentence broken. Read the kept words back to yourself: they must read as a clean, natural, cohesive script with nothing odd or out of place, and each kept sentence must be complete.

Each cut is an inclusive range of word numbers. Prefer a few precise ranges over many single words. If the take is already clean and short, return no cuts.`;

// Reads the transcript like a human editor and cuts flubs, restarts and repeats so the reel flows.
// Uses the Claude API if there's a key, else the person's own Claude Code; returns the words
// unchanged if neither is available (the rule-based tighten still runs either way).
export async function smartCut(words: Word[]): Promise<{ words: Word[]; cut: number; by: "claude" | "none" }> {
  if (words.length < 4) return { words, cut: 0, by: "none" };
  const laterTake = markRetakes(words);
  const transcript = words
    .map((w, i) => {
      const gap = i > 0 ? (w.startMs - words[i - 1].endMs) / 1000 : 0;
      const note = laterTake.has(i) ? ` ⟨said again later from word ${laterTake.get(i)}⟩` : "";
      return `${gap >= 0.5 ? `(pause ${gap.toFixed(1)}s) ` : ""}${i}:${w.text}${w.cut ? "[already cut]" : ""}${note}`;
    })
    .join(" ");

  let plan: z.infer<typeof CutPlan> | null = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await new Anthropic().beta.messages.parse({
        model: config.anthropicModel,
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: "user", content: `Transcript:\n${transcript}` }],
        output_config: { effort: "medium", format: betaZodOutputFormat(CutPlan) },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      if (response.stop_reason !== "refusal") plan = response.parsed_output ?? null;
    } catch (err) {
      console.error("Claude editing pass failed:", err);
    }
  } else {
    const reply = await askClaudeCodeJson<unknown>(
      `${SYSTEM}\n\nReturn JSON like {"cuts": [{"from": 12, "to": 19, "why": "false start"}]}.\n\nTranscript:\n${transcript}`,
    );
    const parsed = reply ? CutPlan.safeParse(reply) : null;
    plan = parsed?.success ? parsed.data : null;
  }
  if (!plan) return { words, cut: 0, by: "none" };

  const remove = new Set<number>();
  for (const c of plan.cuts) {
    for (let i = Math.max(0, c.from); i <= Math.min(words.length - 1, c.to); i++) remove.add(i);
  }
  // Safety net: long rambling takes often lose two thirds, but keeping almost nothing is a
  // misunderstanding, not an edit.
  const spoken = words.filter((w) => !w.cut).length;
  const newlyCut = [...remove].filter((i) => !words[i].cut).length;
  if (spoken - newlyCut < Math.max(3, spoken * 0.15)) return { words, cut: 0, by: "claude" };
  return { words: words.map((w, i) => (remove.has(i) ? { ...w, cut: true } : w)), cut: newlyCut, by: "claude" };
}

const STOP = new Set(
  "a an and are as at be but by for from had has have i i'm if in is it it's just like me my of oh on or so that the their them then there they this to was we were what when which who will with you your".split(" "),
);
const content = (t: string) => t.toLowerCase().replace(/[^a-z0-9' ]/g, "").split(" ").filter((x) => x && !STOP.has(x));

// Finds sentences the speaker said again later (a retake of a line or passage, often far apart),
// so the editor knows to keep the later take. Returns the last word of each earlier sentence ->
// the first word of the sentence that repeats it.
export function markRetakes(words: Word[]): Map<number, number> {
  const sentences: { from: number; to: number; words: Set<string> }[] = [];
  let from = 0;
  words.forEach((w, i) => {
    const next = words[i + 1];
    if (/[.!?]$/.test(w.text) || !next || next.startMs - w.endMs > 900) {
      sentences.push({ from, to: i, words: new Set(content(words.slice(from, i + 1).map((x) => x.text).join(" "))) });
      from = i + 1;
    }
  });
  const out = new Map<number, number>();
  sentences.forEach((a, i) => {
    if (a.words.size < 4) return;
    for (const b of sentences.slice(i + 1, i + 40)) {
      if (b.words.size < 4) continue;
      const shared = [...a.words].filter((x) => b.words.has(x)).length;
      if (shared / Math.min(a.words.size, b.words.size) >= 0.6) {
        out.set(a.to, b.from);
        break;
      }
    }
  });
  return out;
}
