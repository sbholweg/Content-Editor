import React from "react";
import { AbsoluteFill, OffthreadVideo } from "remotion";
import type { ReelProps } from "../shared/types";
import { Captions } from "./Captions";

export const Reel: React.FC<ReelProps> = ({ videoSrc, words, brand }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {videoSrc ? <OffthreadVideo src={videoSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      <Captions words={words} brand={brand} />
    </AbsoluteFill>
  );
};

export const REEL_FPS = 30;
export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
export const durationInFrames = (durationMs: number) => Math.max(1, Math.ceil((durationMs / 1000) * REEL_FPS));
