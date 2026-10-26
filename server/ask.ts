import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { describeReel } from "../src/shared/describe.ts";
import { ReelEdits } from "../src/shared/edits.ts";
import type { Asset, BrandKit, Project } from "../src/shared/types.ts";
import { askClaudeCode } from "./claude-cli.ts";
import { config } from "./config.ts";

const Reply = z.object({ edits: ReelEdits, summary: z.string() });

// The change-reel skill already explains the edit format to Claude Code; the editor's
// "Tell Claude" box reuses it so both stay in step.
async function editGuide() {
  const file = path.join(config.root, ".claude", "skills", "change-reel", "SKILL.md");
  const text = await fs.readFile(file, "utf8").catch(() => "");
  return text.replace(/^---[\s\S]*?---\s*/, "");
}

const parseJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  try {
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
};

// Turns a plain-words request ("make the captions bigger") into reel edits.
export async function askForEdits(
  project: Project,
  request: string,
  brand: BrandKit,
  assets: Asset[],
): Promise<{ edits: ReelEdits; summary: string } | { error: string }> {
  const prompt = `You are editing an Instagram reel for a creator inside their reel editor. They typed a change in plain words. Work out the edits.

How edits work (this guide was written for a command line; here you don't run anything, you only reply with JSON):
${await editGuide()}

Their saved looks: ${brand.looks.map((l) => `"${l.name}"`).join(", ") || "(none)"}. Their brand colors: ${brand.palette.map((c) => `${c.name} ${c.hex}`).join(", ") || "(none)"}.

The reel right now:
${describeReel(project, assets)}

Their request: ${request}

Reply with only JSON: {"edits": { ...the edits... }, "summary": "one short, friendly sentence saying what you changed, in plain words"}.
If the request can't be done with these edits, reply {"edits": {}, "summary": "a short plain explanation of what they can do instead"}.
Never invent facts or numbers in hooks or captions.`;

  let raw: unknown = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await new Anthropic().beta.messages.create({
        model: config.anthropicModel,
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      raw = parseJson(text);
    } catch (err) {
      console.error("Tell Claude failed:", err);
    }
  } else {
    const reply = await askClaudeCode(prompt);
    if (reply === null) return { error: "Claude isn't connected yet. Ask Claude in Claude Code to set it up, or make the change with the buttons." };
    raw = parseJson(reply);
  }
  const parsed = raw ? Reply.safeParse(raw) : null;
  if (!parsed?.success) return { error: "Claude couldn't work that one out. Try saying it another way, e.g. “make the captions bigger”." };
  return parsed.data;
}
