import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Word } from "../src/shared/types.ts";
import { config } from "./config.ts";

const EditPlan = z.object({
  highlights: z.array(z.number().int()).describe("Indexes of words to highlight"),
  emojis: z.array(z.object({ index: z.number().int(), emoji: z.string() })).describe("Sparse emoji accents"),
});

const SYSTEM = `You are a short-form video editor for Instagram talking reels.
You receive a transcript as numbered words. Pick the words that should be visually highlighted in the captions.

Highlight the words a viewer should remember: the hook, numbers, money and time amounts, results, strong verbs, and the key noun of each idea.
- Aim for roughly one highlight per 5-8 words. Never highlight filler (um, like, so, the, and, I, you).
- Prefer single words; highlight two adjacent words only for a tight phrase like "$10k" "per month".
- Add at most one emoji per ~15 seconds, only where it clearly reinforces a word (e.g. money, time, fire, idea). Fewer is better.`;

export async function planHighlights(words: Word[]): Promise<Word[]> {
  if (words.length === 0) return words;
  if (!process.env.ANTHROPIC_API_KEY) return heuristicHighlights(words);

  try {
    const client = new Anthropic();
    const transcript = words.map((w, i) => `${i}:${w.text}`).join(" ");
    const response = await client.beta.messages.parse({
      model: config.anthropicModel,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Transcript (${(words.at(-1)!.endMs / 1000).toFixed(0)}s):\n${transcript}` }],
      output_config: { effort: "low", format: betaZodOutputFormat(EditPlan) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return heuristicHighlights(words);

    const highlight = new Set(response.parsed_output.highlights);
    const emojis = new Map(response.parsed_output.emojis.map((e) => [e.index, e.emoji]));
    return words.map((w, i) => ({ ...w, highlight: highlight.has(i), emoji: emojis.get(i) }));
  } catch (err) {
    console.error("Claude highlight planning failed, using built-in rules instead:", err);
    return heuristicHighlights(words);
  }
}

const STOP_WORDS = new Set(
  "the a an and or but so to of in on at for with from by is are was were be been it this that these those i you we they he she my your our their me us them just like really very about what when then than there here have has had do does did can could would should will not dont don't im i'm its it's".split(" "),
);

// Used when no Claude API key is configured: highlight numbers and the longest meaningful word per few words.
export function heuristicHighlights(words: Word[]): Word[] {
  const result = words.map((w) => ({ ...w, highlight: false }));
  const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9$%']/g, "");
  for (let start = 0; start < result.length; start += 6) {
    const chunk = result.slice(start, start + 6);
    const numeric = chunk.find((w) => /[0-9$%]/.test(w.text));
    const best =
      numeric ??
      chunk
        .filter((w) => !STOP_WORDS.has(clean(w.text)) && clean(w.text).length >= 5)
        .sort((a, b) => clean(b.text).length - clean(a.text).length)[0];
    if (best) best.highlight = true;
  }
  return result;
}
