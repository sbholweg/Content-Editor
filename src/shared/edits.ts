import { z } from "zod";
import { normalizeStyle } from "./brand";
import { autoSounds } from "./autoSounds";
import { BUILTIN_SOUNDS } from "./sounds";
import type { BrandKit, Project } from "./types";
import { isFiller } from "./words";

const indexes = z.array(z.number().int().nonnegative());
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "colors are hex like #8656F6");
const position = z.enum(["top", "middle", "bottom"]);

// Changes Claude (or a script) can make to a reel in one go. Word numbers are the
// [n] numbers printed by `npm run engine -- show`.
export const ReelEdits = z
  .object({
    hookText: z.string().max(200),
    hookSubText: z.string().max(200).describe("second, smaller hook line"),
    postCaption: z.string().max(2200),
    removePauses: z.boolean(),
    keyWords: indexes.describe("replace all key words with exactly these"),
    addKeyWords: indexes,
    removeKeyWords: indexes,
    cut: indexes,
    uncut: indexes,
    cutFillers: z.boolean().describe("cut every um/uh"),
    emojis: z.record(z.string(), z.string().nullable()).describe("word number -> emoji, or null to remove"),
    fixWords: z.record(z.string(), z.string().min(1)).describe("word number -> corrected text"),
    look: z.string().describe('a saved look name, or "default"'),
    style: z
      .object({
        font: z.string(),
        displayFont: z.string(),
        hookColor: color,
        hookPosition: position,
        hookPlace: z
          .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) })
          .nullable()
          .describe("hook center as % of the frame (x across, y down); null = use hookPosition"),
        hookLayout: z.enum(["headline", "eyebrow", "subhead"]),
        hookDurationMs: z.number().int().min(0),
        textColor: color,
        outlineColor: color,
        highlightColor: color,
        highlightTextColor: color,
        style: z.enum(["pill", "color", "serif"]),
        captionMode: z.enum(["phrase", "single", "karaoke"]),
        textEffect: z.enum(["shadow", "outline"]),
        position,
        wordsPerLine: z.number().int().min(1).max(7),
        uppercase: z.boolean(),
        fontSize: z.number().min(30).max(140),
        zoomJumps: z.boolean(),
        speed: z.number().min(1).max(1.5).describe("talking speed; 1.2 is the creator's usual"),
        grade: z.enum(["off", "auto", "bright", "warm", "soft"]).describe("color grading"),
        captionAlign: z.enum(["center", "left", "right"]),
        captionsOn: z.boolean(),
        logo: z.enum(["off", "top-left", "top-right", "bottom-right"]),
      })
      .partial()
      .strict(),
    addMedia: z.array(
      z.object({
        asset: z.string().describe("library item id or name"),
        fromWord: z.number().int().nonnegative(),
        toWord: z.number().int().nonnegative(),
        placement: z.enum(["top", "middle", "bottom", "full"]).optional(),
        size: z.number().min(0.3).max(0.95).optional(),
        x: z.number().min(0).max(100).optional().describe("center, % across the frame"),
        y: z.number().min(0).max(100).optional().describe("center, % down the frame"),
      }),
    ),
    moveMedia: z
      .record(z.string(), z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }))
      .describe("overlay id -> new center, % of the frame"),
    removeMedia: z.array(z.string()).describe("overlay ids"),
    addSounds: z.array(
      z.object({
        sound: z.string().describe("starter sound name (Whoosh, Pop, Click, Ding...) or library sound name"),
        atWord: z.number().int().nonnegative(),
        volume: z.number().min(0).max(1).optional(),
      }),
    ),
    removeSounds: z.array(z.string()).describe('sound cue ids, or "all"'),
    soundsEnabled: z.boolean(),
    clearNotes: z.boolean().describe("true once you've applied the creator's notes on the draft"),
    autoSounds: z.boolean().describe("true adds sound effects by moment: clicks on key words, pops on stickers/emojis, shutters on screenshots, cash register on money talk"),
    music: z
      .object({
        sound: z.string().describe("library sound name"),
        volume: z.number().min(0).max(1).optional(),
        duck: z.boolean().optional(),
      })
      .nullable()
      .describe("null removes the music"),
  })
  .partial()
  .strict();

export type ReelEdits = z.infer<typeof ReelEdits>;

type Library = { id: string; name: string; kind: string }[];

// Applies edits to a reel and returns the changed fields, or throws a readable error.
export function applyEdits(project: Project, edits: ReelEdits, brand: BrandKit, library: Library): Partial<Project> {
  const words = project.words.map((w) => ({ ...w }));
  const at = (n: number) => {
    if (!words[n]) throw new Error(`There is no word [${n}]; this reel has words 0-${words.length - 1}.`);
    return words[n];
  };

  if (edits.keyWords) {
    const keep = new Set(edits.keyWords.map((n) => (at(n), n)));
    words.forEach((w, i) => (w.highlight = keep.has(i)));
  }
  edits.addKeyWords?.forEach((n) => (at(n).highlight = true));
  edits.removeKeyWords?.forEach((n) => (at(n).highlight = false));
  edits.cut?.forEach((n) => (at(n).cut = true));
  edits.uncut?.forEach((n) => (at(n).cut = false));
  if (edits.cutFillers) words.forEach((w) => isFiller(w.text) && (w.cut = true));
  for (const [n, emoji] of Object.entries(edits.emojis ?? {})) at(Number(n)).emoji = emoji ?? undefined;
  for (const [n, text] of Object.entries(edits.fixWords ?? {})) at(Number(n)).text = text;

  const changes: Partial<Project> = { words };
  if (edits.hookText !== undefined) changes.hookText = edits.hookText;
  if (edits.postCaption !== undefined) changes.postCaption = edits.postCaption;
  if (edits.removePauses !== undefined) changes.removePauses = edits.removePauses;

  let style = project.style;
  if (edits.look) {
    const name = edits.look.trim().toLowerCase();
    const saved = name === "default" ? brand.defaultStyle : brand.looks.find((l) => l.name.toLowerCase() === name)?.style;
    if (!saved) throw new Error(`No saved look called "${edits.look}". Saved looks: default${brand.looks.map((l) => `, ${l.name}`).join("")}.`);
    style = saved;
  }
  if (edits.style) style = normalizeStyle({ ...style, ...edits.style });
  if (style !== project.style) changes.style = style;

  let overlays = project.overlays;
  if (edits.removeMedia?.length) overlays = overlays.filter((o) => !edits.removeMedia!.includes(o.id));
  for (const m of edits.addMedia ?? []) {
    const key = m.asset.toLowerCase();
    const asset = library.find((a) => a.id === m.asset) ?? library.find((a) => a.name.toLowerCase() === key);
    if (!asset) throw new Error(`No library item "${m.asset}". Library: ${library.map((a) => a.name).join(", ") || "(empty)"}.`);
    const [from, to] = [Math.min(m.fromWord, m.toWord), Math.max(m.fromWord, m.toWord)];
    overlays = [
      ...overlays,
      {
        id: `ov-${Date.now()}-${overlays.length}`,
        assetId: asset.id,
        startWordId: at(from).id,
        endWordId: at(to).id,
        placement: m.placement ?? (asset.kind === "video" ? "full" : "middle"),
        size: m.size ?? 0.6,
        ...(m.x !== undefined && m.y !== undefined ? { x: m.x, y: m.y } : {}),
      },
    ];
  }
  for (const [id, place] of Object.entries(edits.moveMedia ?? {})) {
    if (!overlays.some((o) => o.id === id)) throw new Error(`No media "${id}" on this reel. Use the ov-… ids from \`show\`.`);
    overlays = overlays.map((o) => (o.id === id ? { ...o, ...place } : o));
  }
  if (overlays !== project.overlays) changes.overlays = overlays;

  if (edits.hookSubText !== undefined) changes.hookSubText = edits.hookSubText;
  if (edits.soundsEnabled !== undefined) changes.soundsEnabled = edits.soundsEnabled;
  if (edits.clearNotes) changes.notes = [];

  const findSound = (name: string) => {
    const key = name.trim().toLowerCase();
    const builtin = BUILTIN_SOUNDS.find((b) => b.id === key || b.name.toLowerCase() === key);
    if (builtin) return builtin.id;
    const mine = library.find((a) => a.kind === "audio" && (a.id === name || a.name.toLowerCase() === key));
    if (mine) return mine.id;
    throw new Error(
      `No sound called "${name}". Starter sounds: ${BUILTIN_SOUNDS.map((b) => b.name).join(", ")}. Your sounds: ${
        library.filter((a) => a.kind === "audio").map((a) => a.name).join(", ") || "(none)"
      }.`,
    );
  };

  let sounds = project.sounds;
  if (edits.removeSounds?.length) sounds = edits.removeSounds.includes("all") ? [] : sounds.filter((c) => !edits.removeSounds!.includes(c.id));
  for (const s of edits.addSounds ?? []) {
    sounds = [...sounds, { id: `snd-${Date.now()}-${sounds.length}`, soundId: findSound(s.sound), wordId: at(s.atWord).id, volume: s.volume ?? 0.8 }];
  }
  if (edits.autoSounds) {
    // Runs after the other changes so new key words, emojis and media get sounds too.
    sounds = autoSounds({ ...project, ...changes, sounds }, library);
    changes.soundsEnabled = true;
  }
  if (sounds !== project.sounds) changes.sounds = sounds;

  if (edits.music === null) changes.music = null;
  else if (edits.music) {
    changes.music = {
      soundId: findSound(edits.music.sound),
      volume: edits.music.volume ?? project.music?.volume ?? 0.35,
      duck: edits.music.duck ?? project.music?.duck ?? true,
      enabled: true,
    };
  }

  return changes;
}
