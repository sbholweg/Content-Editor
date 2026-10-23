import Anthropic from "@anthropic-ai/sdk";
import type { BrandVoice, BusinessProfile } from "../src/shared/types.ts";
import { askClaudeCode } from "./claude-cli.ts";
import { config } from "./config.ts";
import { businessContext } from "./highlights.ts";

const SYSTEM = `You write scripts for short Instagram talking reels, to be read from a teleprompter by an online service provider (VA, OBM, social media manager, coach). Write in their voice, the way they'd actually talk.

- 110-170 words (about 45-70 seconds spoken).
- Line 1 is the hook: one punchy sentence that makes their ideal client stop scrolling.
- Then a short story, example or reason, in plain spoken language, short sentences, one idea per line.
- End with one clear call to action (use theirs if given).
- Never invent results, numbers, client stories or credentials. Where a real detail would help, leave a bracketed placeholder like [your client's result] for them to fill in.
- Put each sentence on its own line. No headings, no stage directions, no emojis, no hashtags. Return only the script.`;

// Claude writes a teleprompter script from an idea, in the creator's voice.
export async function writeScript(idea: string, business: BusinessProfile & { voice?: BrandVoice }): Promise<string | null> {
  const request = `${businessContext(business)}Reel idea: ${idea}`;
  if (!process.env.ANTHROPIC_API_KEY) return askClaudeCode(`${SYSTEM}\n\n${request}`);
  try {
    const response = await new Anthropic().beta.messages.create({
      model: config.anthropicModel,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: request }],
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") return null;
    return response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim() || null;
  } catch (err) {
    console.error("Script writing failed:", err);
    return null;
  }
}
