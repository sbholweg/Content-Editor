import crypto from "node:crypto";
import fs from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { BrandVoice, BusinessProfile, Project, ReelStyle } from "../src/shared/types.ts";
import { config } from "./config.ts";
import { businessContext } from "./highlights.ts";
import { queueRender } from "./render.ts";
import { projectDir, projectFile, readBrand, writeProject } from "./storage.ts";

type Angle = "question" | "bold" | "pov";

// Each trial version tests a different hook angle, and looks different in the first second
// so Instagram's trial audience sees genuinely different openings.
const ANGLES: { angle: Angle; label: string; restyle: (s: ReelStyle) => ReelStyle }[] = [
  { angle: "question", label: "Question", restyle: (s) => ({ ...s, hookPosition: "top" }) },
  { angle: "bold", label: "Bold statement", restyle: (s) => ({ ...s, hookPosition: "middle", displayFont: s.displayFont === "Playfair Display" ? "Bodoni Moda" : "Playfair Display" }) },
  { angle: "pov", label: "POV", restyle: (s) => ({ ...s, hookPosition: "bottom", displayFont: s.displayFont === "Caveat" ? "Fraunces" : "Caveat" }) },
];

const TrialHooks = z.object({
  question: z.string().describe("Hook phrased as a question their ideal client is asking"),
  bold: z.string().describe("Hook as a bold, slightly contrarian statement"),
  pov: z.string().describe('Hook starting with "pov:"'),
});

const SYSTEM = `You write on-screen hooks for Instagram trial reels. Trial reels are shown to non-followers first, so each version tests a different opening.
Write three hooks for the same reel, each 3 to 9 words, lowercase, conversational, in the speaker's voice:
- question: a question their ideal client is already asking themselves
- bold: a bold or slightly contrarian statement
- pov: starts with "pov:" and puts the viewer in a relatable moment
Base them only on what the speaker actually says. No hashtags, no emojis, no quotation marks.`;

async function writeTrialHooks(project: Project, business: BusinessProfile & { voice?: BrandVoice }): Promise<Record<Angle, string>> {
  const spoken = project.words.filter((w) => !w.cut).map((w) => w.text).join(" ");
  const base = project.hookText || spoken.split(/[.!?]/)[0].split(" ").slice(0, 7).join(" ").toLowerCase();
  const fallback = { question: `ever wondered why ${base}?`, bold: base, pov: `pov: ${base}` };
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: config.anthropicModel,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: `${businessContext(business)}Current hook: ${project.hookText}\n\nWhat they say:\n${spoken}` }],
      output_config: { effort: "low", format: betaZodOutputFormat(TrialHooks) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return fallback;
    return response.parsed_output;
  } catch (err) {
    console.error("Trial hook writing failed, using simple versions instead:", err);
    return fallback;
  }
}

export async function createTrialReels(parent: Project): Promise<Project[]> {
  const brand = await readBrand();
  const hooks = await writeTrialHooks(parent, { ...brand.business, voice: brand.voice });
  const created: Project[] = [];
  for (const { angle, label, restyle } of ANGLES) {
    const id = crypto.randomUUID();
    await fs.mkdir(projectDir(id), { recursive: true });
    // Share the prepared video instead of copying it (falls back to a copy across disks).
    await fs.link(projectFile(parent.id, "video.mp4"), projectFile(id, "video.mp4")).catch(() =>
      fs.copyFile(projectFile(parent.id, "video.mp4"), projectFile(id, "video.mp4")),
    );
    const trial: Project = {
      ...parent,
      id,
      createdAt: new Date().toISOString(),
      hookText: hooks[angle],
      style: restyle(parent.style),
      parentId: parent.id,
      variantLabel: label,
      render: { status: "rendering", progress: 0 },
    };
    await writeProject(trial);
    queueRender(id);
    created.push(trial);
  }
  return created;
}
