import React, { useMemo } from "react";
import { AbsoluteFill, OffthreadVideo, Sequence } from "remotion";
import { overlayTimes } from "../shared/overlays";
import { buildTimeline } from "../shared/timeline";
import type { ReelProps } from "../shared/types";
import { Captions } from "./Captions";
import { Hook } from "./Hook";
import { registerCustomFonts } from "./fonts";
import { Overlays } from "./Overlays";
import { Sounds } from "./Sounds";

export const REEL_FPS = 30;
export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
const toFrames = (ms: number) => Math.round((ms / 1000) * REEL_FPS);

// Length of the finished reel after cuts.
export const outputFrames = (props: Pick<ReelProps, "words" | "durationMs" | "removePauses">) =>
  Math.max(1, toFrames(buildTimeline(props.words, props.durationMs, props.removePauses).durationMs));

export const Reel: React.FC<ReelProps> = (props) => {
  const { videoSrc, hookText, hookSubText, words, brand, durationMs, removePauses, overlays, sounds, music, customFonts } = props;
  registerCustomFonts(customFonts ?? []);
  const timeline = useMemo(() => buildTimeline(words, durationMs, removePauses), [words, durationMs, removePauses]);
  const placed = useMemo(() => overlayTimes(overlays ?? [], words, timeline.words), [overlays, words, timeline]);

  // Each kept piece of the original video plays back-to-back.
  let from = 0;
  const pieces = timeline.segments.map((s) => {
    const start = toFrames(s.startMs);
    const length = Math.max(1, toFrames(s.endMs) - start);
    const piece = { from, start, length };
    from += length;
    return piece;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {videoSrc
        ? pieces.map((p) => (
            <Sequence key={`${p.start}-${p.length}`} from={p.from} durationInFrames={p.length} premountFor={REEL_FPS}>
              <OffthreadVideo
                src={videoSrc}
                trimBefore={p.start}
                durationInFrames={p.length}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Sequence>
          ))
        : null}
      <Overlays items={placed} />
      <Sounds sounds={sounds ?? []} music={music ?? null} words={timeline.words} />
      <Hook text={hookText} subText={hookSubText ?? ""} brand={brand} />
      <Captions words={timeline.words} brand={brand} hookText={hookText} />
    </AbsoluteFill>
  );
};
