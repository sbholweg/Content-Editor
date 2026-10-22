import fs from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { normalizeBrand, styleFromBrand } from "../src/shared/brand.ts";
import { FONT_GROUPS } from "../src/shared/fonts.ts";
import type { BrandKit } from "../src/shared/types.ts";
import { askClaudeCodeJson } from "./claude-cli.ts";
import { config } from "./config.ts";
import { addAsset, libraryDir, listAssets } from "./library.ts";
import { run } from "./media.ts";

export const BrandAnswersSchema = z.object({
  name: z.string(),
  what: z.string(),
  audience: z.string(),
  vibe: z.string().describe("their own words plus any chips they picked"),
  inspirationIds: z.array(z.string()),
});

const GeneratedBrand = z.object({
  name: z.string(),
  tagline: z.string(),
  palette: z.array(z.object({ hex: z.string(), name: z.string(), role: z.enum(["primary", "accent", "background", "text", "extra"]) })),
  fonts: z.object({ headline: z.string(), body: z.string(), accent: z.string() }),
  voice: z.object({ tone: z.array(z.string()), phrases: z.array(z.string()), avoid: z.array(z.string()) }),
  story: z.string(),
});
type GeneratedBrand = z.infer<typeof GeneratedBrand>;

const SYSTEM = `You are a senior brand designer. A creator (an online service provider) shares an inspiration board, the way a designer asks clients for a Pinterest board, plus a little about their business and the vibe they want. Build them a cohesive brand that fits the board.

Return:
- name: their business name (keep theirs if given, otherwise suggest one).
- tagline: short, warm, specific to who they help.
- palette: 4-6 colors pulled from the mood of the board, as exact hex codes. Exactly one "primary" (the signature
  color that pops), one "accent", one very light "background", one deep "text" color, and optional "extra" colors.
  Make it cohesive and modern; lots of calm space with one pop. Name each color evocatively.
- fonts: headline, body and accent fonts. Use any Google Fonts family that fits (exact family name as on
  fonts.google.com). The body font must be very readable at caption size. The accent can be a script or
  handwritten font, or a contrasting serif. Avoid overused defaults unless they're clearly right.
- voice: tone words (3-5), phrases they might say (2-4), words to avoid (2-4), fitting their audience.
- story: 2-4 sentences, written to them, on why this brand fits their board and audience.`;

// Small JPEG copies of the board, so they're quick to send.
async function preparedImages(ids: string[]) {
  const assets = await listAssets();
  const out: string[] = [];
  const dir = path.join(config.dataDir, "inspo-small");
  await fs.mkdir(dir, { recursive: true });
  for (const id of ids.slice(0, 12)) {
    const a = assets.find((x) => x.id === id && (x.kind === "image" || x.kind === "gif"));
    if (!a) continue;
    const small = path.join(dir, `${a.id}.jpg`);
    if (!(await fs.stat(small).catch(() => null))) {
      await run("ffmpeg", ["-y", "-i", path.join(libraryDir, a.file), "-frames:v", "1", "-vf", "scale='min(768,iw)':-2", "-q:v", "4", small]);
    }
    out.push(small);
  }
  return out;
}

async function askClaude(answers: z.infer<typeof BrandAnswersSchema>, images: string[]): Promise<GeneratedBrand | null> {
  const about = `Business name: ${answers.name || "(not set)"}\nWhat they do: ${answers.what}\nWho they help: ${answers.audience}\nThe vibe they want: ${answers.vibe}`;
  if (process.env.ANTHROPIC_API_KEY) {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    for (const file of images) {
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: (await fs.readFile(file)).toString("base64") } });
    }
    content.push({ type: "text", text: `${about}\n\nThe images above are their inspiration board.` });
    const response = await new Anthropic().beta.messages.parse({
      model: config.anthropicModel,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: "medium", format: betaZodOutputFormat(GeneratedBrand) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    return response.stop_reason === "refusal" ? null : (response.parsed_output ?? null);
  }
  // Claude Code reads the images itself (read-only access to these files).
  const reply = await askClaudeCodeJson<GeneratedBrand>(
    `${SYSTEM}\n\nLook at each of these inspiration images (use your Read tool on each path):\n${images.join("\n")}\n\n${about}\n\n` +
      `Return JSON: {"name": "", "tagline": "", "palette": [{"hex": "#", "name": "", "role": "primary"}], "fonts": {"headline": "", "body": "", "accent": ""}, "voice": {"tone": [], "phrases": [], "avoid": []}, "story": ""}`,
    ["--allowedTools", "Read"],
    300_000,
  );
  const parsed = reply ? GeneratedBrand.safeParse(reply) : null;
  return parsed?.success ? parsed.data : null;
}

const BUNDLED = new Set<string>(FONT_GROUPS.flatMap((g) => g.fonts.map((f) => f.name)));

// Makes sure a font can be used: bundled, already in the library, or downloaded from Google Fonts.
// Returns the name to use (falls back to a bundled font if it can't be downloaded).
async function ensureFont(family: string, fallback: string, weight?: number): Promise<string> {
  if (BUNDLED.has(family)) return family;
  if ((await listAssets()).some((a) => a.kind === "font" && a.name === family)) return family;
  try {
    const cssFor = async (w?: number) => {
      const res = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}${w ? `:wght@${w}` : ""}&display=swap`, {
        // A modern browser user agent gets woff2 files.
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
      });
      return res.ok ? res.text() : null;
    };
    const css = (weight ? await cssFor(weight) : null) ?? (await cssFor());
    // The last block is the Latin subset.
    const urls = [...(css ?? "").matchAll(/url\((https:[^)]+\.woff2)\)/g)].map((m) => m[1]);
    const url = urls.at(-1);
    if (!url) return fallback;
    const file = path.join(config.dataDir, "uploads", `font-${Date.now()}.woff2`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
    await addAsset({ path: file, originalname: `${family}.woff2`, mimetype: "font/woff2" });
    return family;
  } catch (err) {
    console.error(`Couldn't download the font "${family}":`, err);
    return fallback;
  }
}

export async function generateBrand(current: BrandKit, answers: z.infer<typeof BrandAnswersSchema>): Promise<BrandKit | null> {
  const images = await preparedImages(answers.inspirationIds);
  const made = await askClaude(answers, images).catch((err) => {
    console.error("Brand generation failed:", err);
    return null;
  });
  if (!made) return null;
  const fonts = {
    headline: await ensureFont(made.fonts.headline, current.fonts.headline, 700),
    body: await ensureFont(made.fonts.body, current.fonts.body, 500),
    accent: await ensureFont(made.fonts.accent, current.fonts.accent),
  };
  const hex = /^#[0-9a-fA-F]{6}$/;
  const brand = normalizeBrand({
    ...current,
    name: answers.name || made.name,
    tagline: made.tagline,
    setUp: true,
    palette: made.palette.filter((c) => hex.test(c.hex)).map((c) => ({ ...c, hex: c.hex.toUpperCase() })),
    fonts,
    voice: made.voice,
    story: made.story,
    inspiration: answers.inspirationIds,
    business: { ...current.business, what: answers.what || current.business.what, audience: answers.audience || current.business.audience },
  });
  return { ...brand, defaultStyle: styleFromBrand(brand, brand.defaultStyle) };
}
