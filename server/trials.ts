import crypto from "node:crypto";
import fs from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { BrandVoice, BusinessProfile, Project } from "../src/shared/types.ts";
import { askClaudeCodeJson } from "./claude-cli.ts";
import { config } from "./config.ts";
import { businessContext } from "./highlights.ts";
import { listAssets, syncBrollFolder } from "./library.ts";
import { queueRender } from "./render.ts";
import { projectDir, readBrand, writeProject } from "./storage.ts";

// Trial reels are shown to non-followers first. Ours are short b-roll reels with a strong hook on
// screen and the substance of the talking reel in the caption: same topic, a different format.
const TrialPlan = z.object({
  hooks: z.array(z.object({ angle: z.string(), hook: z.string(), nudge: z.string() })).describe("exactly 3"),
  captionBody: z.string().describe("the useful content of the reel, written to be read"),
  hashtags: z.array(z.string()),
});
type TrialPlan = z.infer<typeof TrialPlan>;

const SYSTEM = `You turn a talking reel into Instagram trial reels for an online service provider. Each trial reel is a 7-second b-roll clip (no talking) with a hook on screen; the value lives in the caption.

Write:
- hooks: 3 different on-screen hooks for the same topic, 4-10 words each, in their voice, each a different angle
  (e.g. a question their ideal client asks, a bold or contrarian statement, a "pov:" or relatable moment).
  "angle" is a 1-3 word label. "nudge" is a short line under the hook, like "read the caption 👇" or "save this for later".
- captionBody: the substance of what they said, rewritten to be read: short paragraphs or a tight numbered list,
  skimmable, 80-180 words. Don't repeat the hook. No call to action (it's added separately).
  Trial reels reach people who never saw the original, so the caption must stand on its own: never mention
  "the full reel", "the video" or "my last post". Teach the actual points.
- hashtags: 3-5 relevant hashtags.
Use only what they actually said. Never invent results, numbers or stories. Plain, warm, conversational.`;

function fallbackPlan(project: Project): TrialPlan {
  const spoken = project.words.filter((w) => !w.cut).map((w) => w.text).join(" ");
  const base = project.hookText || spoken.split(/[.!?]/)[0].split(" ").slice(0, 7).join(" ").toLowerCase();
  return {
    hooks: [
      { angle: "Question", hook: `ever wondered why ${base}?`, nudge: "read the caption 👇" },
      { angle: "Bold statement", hook: base, nudge: "the details are in the caption" },
      { angle: "POV", hook: `pov: ${base}`, nudge: "save this for later ↓" },
    ],
    captionBody: spoken,
    hashtags: [],
  };
}

async function planTrials(project: Project, business: BusinessProfile & { voice?: BrandVoice }): Promise<TrialPlan> {
  const spoken = project.words.filter((w) => !w.cut).map((w) => w.text).join(" ");
  const request = `${businessContext(business)}Talking reel hook: ${project.hookText}\n\nWhat they say:\n${spoken}`;
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const response = await new Anthropic().beta.messages.parse({
        model: config.anthropicModel,
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: "user", content: request }],
        output_config: { effort: "low", format: betaZodOutputFormat(TrialPlan) },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      if (response.stop_reason !== "refusal" && response.parsed_output?.hooks.length) return response.parsed_output;
    } else {
      const reply = await askClaudeCodeJson<TrialPlan>(
        `${SYSTEM}\n\nReturn JSON: {"hooks": [{"angle": "", "hook": "", "nudge": ""}, ...3], "captionBody": "", "hashtags": []}\n\n${request}`,
      );
      const parsed = reply ? TrialPlan.safeParse(reply) : null;
      if (parsed?.success && parsed.data.hooks.length) return parsed.data;
    }
  } catch (err) {
    console.error("Trial reel planning failed, using simple versions instead:", err);
  }
  return fallbackPlan(project);
}

export class NoBrollError extends Error {}

export async function createTrialReels(parent: Project): Promise<Project[]> {
  await syncBrollFolder().catch(() => 0);
  const clips = (await listAssets()).filter((a) => a.kind === "video");
  if (!clips.length) {
    throw new NoBrollError(`Add some b-roll first: put clips in the broll folder (${config.brollDir}) or upload them in your Library.`);
  }
  const brand = await readBrand();
  const plan = await planTrials(parent, { ...brand.business, voice: brand.voice });
  const cta = brand.ctaKeywords[0] || brand.business.cta;
  // Different clips for each version, rotating through the library (newest first).
  const perReel = Math.min(2, clips.length);

  const created: Project[] = [];
  for (const [i, h] of plan.hooks.slice(0, 3).entries()) {
    const id = crypto.randomUUID();
    await fs.mkdir(projectDir(id), { recursive: true });
    // Each version opens on a different clip (the opening second matters most for trials).
    const clipIds = Array.from({ length: perReel }, (_, k) => clips[(i + k) % clips.length].id);
    const trial: Project = {
      ...parent,
      id,
      kind: "broll",
      broll: { clipIds, lengthMs: 7000 },
      createdAt: new Date().toISOString(),
      hookText: h.hook,
      hookSubText: h.nudge,
      postCaption: [h.hook.charAt(0).toUpperCase() + h.hook.slice(1), plan.captionBody, cta, plan.hashtags.join(" ")].filter(Boolean).join("\n\n"),
      overlays: [],
      sounds: [],
      carousel: [],
      stories: [],
      parentId: parent.id,
      variantLabel: h.angle,
      posted: false,
      render: { status: "rendering", progress: 0 },
    };
    await writeProject(trial);
    queueRender(id);
    created.push(trial);
  }
  return created;
}
