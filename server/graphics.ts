import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Asset, BrandVoice, BusinessProfile, Overlay, Word } from "../src/shared/types.ts";
import { askClaudeCodeJson } from "./claude-cli.ts";
import { config } from "./config.ts";
import { businessContext } from "./highlights.ts";

const Suggestions = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum(["sticker", "stat", "cta", "media"]),
      text: z.string().describe("sticker words, the number exactly as said (e.g. $800+), or the comment keyword"),
      sub: z.string().optional().describe("stat: short label under the number"),
      asset: z.string().optional().describe("media: the library item's exact name"),
      fromWord: z.number().int(),
      toWord: z.number().int(),
      why: z.string(),
    }),
  ),
});
type Suggestion = z.infer<typeof Suggestions>["suggestions"][number];

const SYSTEM = `You are the motion-graphics editor for an Instagram talking reel. You get the finished script as numbered words, and the creator's library of GIFs and images. Suggest a few on-screen graphics that make the reel more engaging, timed to the words.

Graphic types:
- "sticker": a short tilted tag that punctuates a moment: a label, reaction or hot take, 1-4 words, e.g. "UNPOPULAR OPINION", "RED FLAG", "SAVE THIS", "PLOT TWIST", "THE FIX". Use the creator's own language where you can.
- "stat": a big number that counts up, with a short label ("sub"). ONLY for a number they actually say (money, %, clients, hours, followers). Write it as they'd show it: "$10,000", "3x", "45k", "80%". Never invent or round a number they didn't say.
- "cta": a comment-keyword bubble, ONLY when they ask people to comment or DM a specific word ("comment EDIT", "DM me HOURS"). text = the keyword, sub = "Comment" or "DM me".
- "media": one of their library GIFs/images, only when its name clearly matches what they're saying at that moment. Use the exact name.

Rules:
- Quality over quantity: about one graphic per 8-12 seconds of reel, never two overlapping, none in the first 2 seconds (the hook is on screen). Short reels may only deserve 1-2.
- Each graphic shows for a phrase: fromWord..toWord spans 3-12 words, starting on the word it's about.
- Stickers must feel natural to their voice, never cringe or generic.
- why: one short line on what it adds, for the creator.`;

const MIN_GAP_WORDS = 6;

// Claude suggests graphics for a reel. Without Claude, falls back to the safe ones:
// numbers they say and "comment <word>" calls to action.
export async function suggestGraphics(
  words: Word[],
  library: Asset[],
  business: BusinessProfile & { voice?: BrandVoice },
): Promise<{ overlays: Overlay[]; by: "claude" | "rules" }> {
  const kept = words.map((w, i) => ({ w, i })).filter(({ w }) => !w.cut);
  if (kept.length < 5) return { overlays: [], by: "rules" };
  const media = library.filter((a) => (a.kind === "gif" || a.kind === "image") && a.collection !== "inspo");
  const script = kept.map(({ w, i }) => `${i}:${w.text}`).join(" ");
  const request = `${businessContext(business)}Library GIFs/images: ${media.map((a) => `"${a.name}" (${a.kind})`).join(", ") || "(none)"}\n\nScript:\n${script}`;

  let raw: Suggestion[] | null = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await new Anthropic().beta.messages.parse({
        model: config.anthropicModel,
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: "user", content: request }],
        output_config: { effort: "medium", format: betaZodOutputFormat(Suggestions) },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      if (response.stop_reason !== "refusal") raw = response.parsed_output?.suggestions ?? null;
    } catch (err) {
      console.error("Claude graphics suggestions failed:", err);
    }
  } else {
    const reply = await askClaudeCodeJson<unknown>(
      `${SYSTEM}\n\nReturn JSON like {"suggestions": [{"type": "stat", "text": "$10,000", "sub": "in one month", "fromWord": 40, "toWord": 47, "why": "makes the result pop"}]}.\n\n${request}`,
    );
    const parsed = reply ? Suggestions.safeParse(reply) : null;
    raw = parsed?.success ? parsed.data.suggestions : null;
  }
  const by = raw ? "claude" : "rules";
  return { overlays: toOverlays(raw ?? ruleSuggestions(words), words, media), by };
}

// Checks each suggestion against the script before it goes on the reel: real word numbers,
// numbers they actually said, library items that exist, and no pile-ups.
function toOverlays(list: Suggestion[], words: Word[], media: Asset[]): Overlay[] {
  const out: Overlay[] = [];
  const keptIndex = (i: number, dir: 1 | -1) => {
    for (let k = i; k >= 0 && k < words.length; k += dir) if (!words[k].cut) return k;
    return -1;
  };
  const spoken = (from: number, to: number) => words.slice(Math.max(0, from - 3), to + 4).map((w) => w.text).join(" ");
  const digits = (t: string) => t.replace(/[^0-9]/g, "");
  const used: [number, number][] = [];
  for (const s of list) {
    const from = keptIndex(Math.max(0, s.fromWord), 1);
    const to = keptIndex(Math.min(words.length - 1, Math.max(s.toWord, s.fromWord)), -1);
    if (from < 0 || to < from || from < 2) continue;
    if (used.some(([a, b]) => from <= b + MIN_GAP_WORDS && to >= a - MIN_GAP_WORDS)) continue;
    const text = s.text.trim().slice(0, 40);
    if (!text) continue;
    let overlay: Overlay | null = null;
    const base = { id: `ov-${Date.now()}-${out.length}`, startWordId: words[from].id, endWordId: words[to].id, placement: "middle" as const, size: 0.6, suggested: true, why: s.why.slice(0, 160) };
    if (s.type === "media") {
      const asset = media.find((a) => a.name.toLowerCase() === (s.asset ?? "").toLowerCase());
      if (asset) overlay = { ...base, assetId: asset.id };
    } else if (s.type === "stat") {
      // Never show a number they didn't say.
      if (digits(text) && digits(spoken(from, to)).includes(digits(text))) overlay = { ...base, assetId: "", graphic: { kind: "stat", text, sub: s.sub?.slice(0, 40) } };
    } else {
      overlay = { ...base, assetId: "", graphic: { kind: s.type, text, sub: s.sub?.slice(0, 20) } };
    }
    if (overlay) {
      out.push(overlay);
      used.push([from, to]);
    }
  }
  return out;
}

// Without Claude: a counting number for money/percent/multiples they say, and a comment bubble
// for "comment <WORD>" / "DM me <WORD>".
function ruleSuggestions(words: Word[]): Suggestion[] {
  const out: Suggestion[] = [];
  words.forEach((w, i) => {
    if (w.cut) return;
    const t = w.text.replace(/[.,!?]+$/, "");
    if (/^\$\d|^\d[\d,.]*(k|%|x)$/i.test(t)) out.push({ type: "stat", text: t, fromWord: i, toWord: Math.min(words.length - 1, i + 5), why: "Makes the number stick" });
    const prev = words[i - 1]?.text.toLowerCase().replace(/[^a-z]/g, "");
    if ((prev === "comment" || prev === "dm" || prev === "me") && /^[A-Z"“]/.test(w.text)) {
      out.push({ type: "cta", text: t.replace(/["“”]/g, "").toUpperCase(), sub: prev === "comment" ? "Comment" : "DM me", fromWord: i - 1, toWord: Math.min(words.length - 1, i + 6), why: "Shows the keyword to comment" });
    }
  });
  return out;
}
