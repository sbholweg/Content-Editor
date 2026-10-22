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

const SYSTEM = `You are the editor of a fast, polished Instagram/TikTok talking reel. You receive the raw transcript of one take as numbered words, with gaps in seconds shown as (pause 1.4s). Your job: decide which words to cut so the finished reel sounds like the creator said it perfectly in one smooth go.

Cut:
- False starts and restarts: when they begin a sentence, stop, and say it again, cut the abandoned attempt and keep the final, cleanest version. Example: "but you've sort of, maybe you're traveling, but you're going to travel for the holidays" -> keep only "but you're going to travel for the holidays".
- Repeated words or phrases, stumbles, mispronounced words they then correct, and self-corrections ("on Monday, no, Tuesday" -> "on Tuesday").
- Filler and verbal tics that add nothing: um, uh, like, you know, I mean, so yeah, anyway, basically, kind of, sort of, okay so.
- Non-speech marked in brackets or parentheses, e.g. (cough), [laughs], [BLANK_AUDIO].
- Talking to themselves or the camera that isn't part of the message: "wait", "let me start over", "hold on", "okay", "is this recording", trailing "and um so...".
- A slow warm-up before the real first line, and anything after the final point/call to action.
- A point said twice: keep the stronger version.

Never:
- Change their meaning, cut a real point, a punchline, a number, or their call to action.
- Leave a sentence that no longer makes grammatical sense after the cut. Read the kept words back to yourself: they must read as a clean, natural, cohesive script with nothing odd or out of place.
- Cut deliberate emphasis or rhythm ("no, no, no", "very very").

Each cut is an inclusive range of word numbers. Prefer a few precise ranges over many single words. If the take is already clean, return no cuts.`;

// Reads the transcript like a human editor and cuts flubs, restarts and repeats so the reel flows.
// Uses the Claude API if there's a key, else the person's own Claude Code; returns the words
// unchanged if neither is available (the rule-based tighten still runs either way).
export async function smartCut(words: Word[]): Promise<{ words: Word[]; cut: number; by: "claude" | "none" }> {
  if (words.length < 4) return { words, cut: 0, by: "none" };
  const transcript = words
    .map((w, i) => {
      const gap = i > 0 ? (w.startMs - words[i - 1].endMs) / 1000 : 0;
      return `${gap >= 0.5 ? `(pause ${gap.toFixed(1)}s) ` : ""}${i}:${w.text}${w.cut ? "[already cut]" : ""}`;
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
  // Safety net: an edit that removes most of what they said is a misunderstanding, not an edit.
  const spoken = words.filter((w) => !w.cut).length;
  const newlyCut = [...remove].filter((i) => !words[i].cut).length;
  if (newlyCut > spoken * 0.5) return { words, cut: 0, by: "claude" };
  return { words: words.map((w, i) => (remove.has(i) ? { ...w, cut: true } : w)), cut: newlyCut, by: "claude" };
}
