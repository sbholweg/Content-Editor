import React, { useId, useMemo } from "react";
import { gradeMatrix } from "../shared/grade";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, useCurrentFrame } from "remotion";
import { buildLines } from "../shared/lines";
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
export const outputFrames = (props: Pick<ReelProps, "words" | "durationMs" | "removePauses" | "silences" | "brand">) =>
  Math.max(1, toFrames(buildTimeline(props.words, props.durationMs, props.removePauses, props.silences, props.brand.speed).durationMs));

export const Reel: React.FC<ReelProps> = (props) => {
  const { videoSrc, hookText, hookSubText, words, brand, durationMs, removePauses, silences, overlays, sounds, music, customFonts, logoSrc } = props;
  registerCustomFonts(customFonts ?? []);
  const speed = brand.speed || 1;
  const timeline = useMemo(() => buildTimeline(words, durationMs, removePauses, silences, speed), [words, durationMs, removePauses, silences, speed]);
  const frame = useCurrentFrame();
  const lineStarts = useMemo(() => buildLines(timeline.words).map((l) => l.words[0].startMs), [timeline]);
  // Zoom jumps: every other line is punched in a little, switching right as the line starts.
  const lineIndex = lineStarts.filter((ms) => ms <= (frame / REEL_FPS) * 1000).length - 1;
  const zoom = brand.zoomJumps && lineIndex % 2 === 1 ? 1.14 : 1;
  const placed = useMemo(() => overlayTimes(overlays ?? [], words, timeline.words), [overlays, words, timeline]);
  // Color grading is an SVG color matrix on the video layer only (captions and graphics keep their colors).
  const grade = gradeMatrix(brand.grade, props.colorStats);
  const gradeId = `grade${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // Each kept piece of the original video plays back-to-back, sped up if the look says so.
  // start is in original-video frames; length is in finished-reel frames.
  let from = 0;
  const pieces = timeline.segments.map((s) => {
    const start = toFrames(s.startMs);
    const length = Math.max(1, Math.round((toFrames(s.endMs) - start) / speed));
    const piece = { from, start, length };
    from += length;
    return piece;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {grade ? (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <filter id={gradeId} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={grade} />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 38%", filter: grade ? `url(#${gradeId})` : undefined }}>
        {videoSrc
          ? pieces.map((p) => (
              <Sequence key={`${p.start}-${p.length}`} from={p.from} durationInFrames={p.length} premountFor={REEL_FPS}>
                <OffthreadVideo
                  src={videoSrc}
                  trimBefore={p.start}
                  playbackRate={speed}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Sequence>
            ))
          : null}
      </AbsoluteFill>
      <Overlays items={placed} />
      <Sounds sounds={sounds ?? []} music={music ?? null} words={timeline.words} />
      <Hook text={hookText} subText={hookSubText ?? ""} brand={brand} />
      <Captions words={timeline.words} brand={brand} hookText={hookText} />
      {logoSrc && brand.logo && brand.logo !== "off" ? (
        <Img
          src={logoSrc}
          style={{
            position: "absolute",
            width: 150,
            maxHeight: 110,
            objectFit: "contain",
            opacity: 0.92,
            // Bottom-right sits above Instagram's buttons and caption.
            top: brand.logo === "bottom-right" ? undefined : 70,
            bottom: brand.logo === "bottom-right" ? 420 : undefined,
            left: brand.logo === "top-left" ? 60 : undefined,
            right: brand.logo === "top-left" ? undefined : 60,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
