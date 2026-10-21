import { builtinSound } from "./sounds";
import type { Asset, Project, ReelProps } from "./types";

type ReelFields = Pick<
  Project,
  "hookText" | "hookSubText" | "words" | "style" | "durationMs" | "removePauses" | "overlays" | "sounds" | "music" | "soundsEnabled"
>;

// Turns a reel plus the creator's library into everything the video needs to draw and play.
// Used by the editor preview and by the exporter, so both always match.
export function reelProps(
  reel: ReelFields,
  assets: Asset[],
  urls: { video: string; library: (file: string) => string; sfx: (file: string) => string },
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
    overlays: reel.overlays.flatMap((o) => {
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
  };
}
