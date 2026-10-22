import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { BrandVoice, BusinessProfile, Word } from "../src/shared/types.ts";
import { config } from "./config.ts";

const EditPlan = z.object({
  hook: z.string().describe("Short on-screen title for the first seconds of the reel"),
  highlights: z.array(z.number().int()).describe("Indexes of words to highlight"),
  emojis: z.array(z.object({ index: z.number().int(), emoji: z.string() })).describe("Sparse emoji accents"),
});

const SYSTEM = `You are a short-form video editor for Instagram talking reels.
You receive a transcript as numbered words. Pick the words that should be visually highlighted in the captions.

Highlight the words a viewer should remember: the hook, numbers, money and time amounts, results, strong verbs, and the key noun of each idea.
- Aim for roughly one highlight per 5-8 words. Never highlight filler (um, like, so, the, and, I, you).
- Prefer single words; highlight two adjacent words only for a tight phrase like "$10k" "per month".
- Add at most one emoji per ~15 seconds, only where it clearly reinforces a word (e.g. money, time, fire, idea). Fewer is better.

Also write the hook: a short title shown at the top of the reel for the first few seconds, so people stop scrolling.
- 3 to 8 words, lowercase, conversational, in the speaker's own voice (e.g. "nobody's saying it, so i will").
- Base it on what they actually say. No hashtags, no emojis, no quotation marks.`;

export type EditSuggestions = { words: Word[]; hook: string };

// Describes the creator's business so suggestions speak to their ideal client.
export function businessContext(business: BusinessProfile & { voice?: BrandVoice }) {
  const v = business.voice;
  const lines = [
    business.what && `What they do: ${business.what}`,
    v?.tone.length && `Their brand voice: ${v.tone.join(", ")}`,
    v?.phrases.length && `Phrases they like to use: ${v.phrases.join("; ")}`,
    v?.avoid.length && `Never use: ${v.avoid.join("; ")}`,
    business.audience && `Who they help: ${business.audience}`,
    business.cta && `Their usual call to action: ${business.cta}`,
  ].filter(Boolean);
  return lines.length ? `About the creator's business:\n${lines.join("\n")}\n\n` : "";
}

export async function planEdit(words: Word[], business: BusinessProfile & { voice?: BrandVoice }): Promise<EditSuggestions> {
  if (words.length === 0) return { words, hook: "" };
  if (!process.env.ANTHROPIC_API_KEY) return heuristicEdit(words);

  try {
    const client = new Anthropic();
    const transcript = words.map((w, i) => `${i}:${w.text}`).join(" ");
    const response = await client.beta.messages.parse({
      model: config.anthropicModel,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `${businessContext(business)}Transcript (${(words.at(-1)!.endMs / 1000).toFixed(0)}s):\n${transcript}`,
        },
      ],
      output_config: { effort: "low", format: betaZodOutputFormat(EditPlan) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return heuristicEdit(words);

    const highlight = new Set(response.parsed_output.highlights);
    const emojis = new Map(response.parsed_output.emojis.map((e) => [e.index, e.emoji]));
    return {
      words: words.map((w, i) => ({ ...w, highlight: highlight.has(i), emoji: emojis.get(i) })),
      hook: response.parsed_output.hook.trim(),
    };
  } catch (err) {
    console.error("Claude highlight planning failed, using built-in rules instead:", err);
    return heuristicEdit(words);
  }
}

// Used when no Claude API key is configured.
function heuristicEdit(words: Word[]): EditSuggestions {
  return { words: heuristicHighlights(words), hook: firstSentence(words) };
}

function firstSentence(words: Word[]) {
  const picked: string[] = [];
  for (const w of words) {
    picked.push(w.text);
    if (/[.!?]$/.test(w.text) || picked.length >= 7) break;
  }
  return picked.join(" ").replace(/[.!?]$/, "").toLowerCase();
}

const STOP_WORDS = new Set(
  "the a an and or but so to of in on at for with from by is are was were be been it this that these those i you we they he she my your our their me us them just like really very about what when then than there here have has had do does did can could would should will not dont don't im i'm its it's".split(" "),
);

// Highlights numbers and the longest meaningful word per few words.
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
