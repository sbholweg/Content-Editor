import { builtinSound } from "./sounds";
import type { Asset, BrollReelProps, Project, ReelProps } from "./types";

type ReelFields = Pick<
  Project,
  "hookText" | "hookSubText" | "words" | "style" | "durationMs" | "removePauses" | "overlays" | "sounds" | "music" | "soundsEnabled" | "silences" | "colorStats" | "endCard"
>;

// Turns a reel plus the creator's library into everything the video needs to draw and play.
// Used by the editor preview and by the exporter, so both always match.
export function reelProps(
  reel: ReelFields,
  assets: Asset[],
  urls: { video: string; library: (file: string) => string; sfx: (file: string) => string },
  logoAssetId = "",
): ReelProps {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const soundSrc = (id: string) => {
    const builtin = builtinSound(id);
    if (builtin) return urls.sfx(builtin.file);
    const asset = byId.get(id);
    return asset?.kind === "audio" ? urls.library(asset.file) : null;
  };

  return {
    videoSrc: urls.video,
    hookText: reel.hookText,
    hookSubText: reel.hookSubText,
    words: reel.words,
    brand: reel.style,
    durationMs: reel.durationMs,
    removePauses: reel.removePauses,
    silences: reel.silences ?? [],
    overlays: reel.overlays.flatMap((o): ReelProps["overlays"] => {
      if (o.graphic) return [{ ...o, src: "", kind: "graphic" as const, width: 0, height: 0 }];
      const a = byId.get(o.assetId);
      return a && (a.kind === "gif" || a.kind === "image" || a.kind === "video")
        ? [{ ...o, src: urls.library(a.file), kind: a.kind, width: a.width, height: a.height }]
        : [];
    }),
    sounds: reel.soundsEnabled
      ? reel.sounds.flatMap((s) => {
          const src = soundSrc(s.soundId);
          return src ? [{ ...s, src }] : [];
        })
      : [],
    music: (() => {
      if (!reel.music?.enabled) return null;
      const src = soundSrc(reel.music.soundId);
      return src ? { ...reel.music, src } : null;
    })(),
    customFonts: assets.filter((a) => a.kind === "font").map((a) => ({ name: a.name, url: urls.library(a.file) })),
    colorStats: reel.colorStats,
    endCard: reel.endCard?.on && reel.endCard.text.trim() ? reel.endCard : undefined,
    endCardSound: reel.soundsEnabled ? urls.sfx("pop-cartoon.mp3") : undefined,
    typingSounds: reel.soundsEnabled ? ["key-1.mp3", "key-2.mp3", "key-3.mp3"].map(urls.sfx) : [],
    logoSrc: (() => {
      const logo = byId.get(logoAssetId);
      return logo ? urls.library(logo.file) : "";
    })(),
  };
}

// Everything a b-roll trial reel needs to draw and play.
export function brollProps(
  reel: Pick<Project, "hookText" | "hookSubText" | "style" | "broll" | "music">,
  assets: Asset[],
  urls: { library: (file: string) => string; sfx: (file: string) => string },
): BrollReelProps {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const clips = (reel.broll?.clipIds ?? []).flatMap((id) => {
    const a = byId.get(id);
    return a && a.kind === "video" ? [{ src: urls.library(a.file), durationMs: a.durationMs }] : [];
  });
  const musicAsset = reel.music?.enabled ? byId.get(reel.music.soundId) : undefined;
  const builtin = reel.music?.enabled ? builtinSound(reel.music.soundId) : undefined;
  const musicSrc = builtin ? urls.sfx(builtin.file) : musicAsset?.kind === "audio" ? urls.library(musicAsset.file) : null;
  return {
    clips,
    hookText: reel.hookText,
    hookSubText: reel.hookSubText,
    style: reel.style,
    lengthMs: reel.broll?.lengthMs ?? 7000,
    music: reel.music && musicSrc ? { ...reel.music, src: musicSrc } : null,
    customFonts: assets.filter((a) => a.kind === "font").map((a) => ({ name: a.name, url: urls.library(a.file) })),
  };
}
