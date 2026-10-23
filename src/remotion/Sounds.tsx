import React from "react";
import { Audio, interpolate, Sequence, useVideoConfig } from "remotion";
import type { ReelProps, Word } from "../shared/types";

// Sound effects sit well under the voice (like a pro mix): every effect is scaled by this,
// so a cue at full volume still never competes with what's being said.
export const SFX_MIX = 0.35;

// Sound effects play when their word is spoken; music plays under the whole reel and
// dips while the creator is talking.
export const Sounds: React.FC<{ sounds: ReelProps["sounds"]; music: ReelProps["music"]; words: Word[] }> = ({ sounds, music, words }) => {
  const { fps } = useVideoConfig();
  const byId = new Map(words.map((w) => [w.id, w]));

  // Frames where someone is speaking, padded a little so the music doesn't pump between words.
  const talking = (frame: number) => {
    const ms = (frame / fps) * 1000;
    return words.some((w) => ms >= w.startMs - 250 && ms <= w.endMs + 350);
  };

  return (
    <>
      {sounds.map((s) => {
        const w = byId.get(s.wordId);
        if (!w) return null;
        return (
          <Sequence key={s.id} from={Math.round((w.startMs / 1000) * fps)} durationInFrames={fps * 6} layout="none">
            <Audio src={s.src} volume={s.volume * SFX_MIX} />
          </Sequence>
        );
      })}
      {music ? (
        <Audio
          src={music.src}
          loop
          volume={(frame) => {
            const base = music.volume;
            if (!music.duck) return base;
            // Smooth the dip over a few frames by sampling around the current one.
            const nearby = [-6, -3, 0, 3, 6].filter((d) => talking(frame + d)).length / 5;
            return interpolate(nearby, [0, 1], [base, base * 0.3]);
          }}
        />
      ) : null}
    </>
  );
};
