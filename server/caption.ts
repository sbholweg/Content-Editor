import Anthropic from "@anthropic-ai/sdk";
import type { BrandVoice, BusinessProfile, Word } from "../src/shared/types.ts";
import { businessContext } from "./highlights.ts";
import { config } from "./config.ts";

const SYSTEM = `You write Instagram captions for online service providers (virtual assistants, online business managers, social media managers, designers, coaches and similar) to post with their talking reels.

Write in the creator's own voice, based only on what they say in the reel. Do not invent results, numbers, client stories or credentials they didn't mention.

Structure:
- First line: a short hook that makes their ideal client keep reading (it shows before "more").
- 2-4 short lines or a tight list expanding on the reel's main point, written for their ideal client.
- A clear call to action on its own line. If they gave a usual call to action, use it.
- A blank line, then 3-5 relevant hashtags.

Keep it warm, plain-spoken and easy to skim. Use line breaks, at most 2 emojis. Return only the caption text.`;

export async function writeCaption(opts: { words: Word[]; hook: string; business: BusinessProfile & { voice?: BrandVoice }; cta: string }): Promise<string> {
  const spoken = opts.words.filter((w) => !w.cut).map((w) => w.text).join(" ");
  const cta = opts.cta.trim() || opts.business.cta.trim();
  if (!process.env.ANTHROPIC_API_KEY) return templateCaption(opts.hook, spoken, cta);

  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: config.anthropicModel,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          businessContext({ ...opts.business, cta }) +
          (opts.hook ? `On-screen hook: ${opts.hook}\n\n` : "") +
          `What they say in the reel:\n${spoken}`,
      },
    ],
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (response.stop_reason === "refusal") return templateCaption(opts.hook, spoken, cta);
  return response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
}

// Used when no Claude API key is configured: a simple, editable starting point.
function templateCaption(hook: string, spoken: string, cta: string) {
  const firstSentences = spoken.match(/[^.!?]+[.!?]/g)?.slice(0, 2).join(" ").trim() ?? spoken.slice(0, 200);
  return [hook ? hook.charAt(0).toUpperCase() + hook.slice(1) : "", "", firstSentences, "", cta || "Save this for later 💜"]
    .join("\n")
    .trim();
}
