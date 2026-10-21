import React from "react";
import { Composition, registerRoot } from "remotion";
import { DEFAULT_BRAND } from "../shared/brand";
import type { ReelProps } from "../shared/types";
import { durationInFrames, Reel, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from "./Reel";

const defaultProps: ReelProps = { videoSrc: "", hookText: "", words: [], brand: DEFAULT_BRAND, durationMs: 3000 };

const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={REEL_WIDTH}
    height={REEL_HEIGHT}
    fps={REEL_FPS}
    durationInFrames={durationInFrames(defaultProps.durationMs)}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => ({ durationInFrames: durationInFrames(props.durationMs) })}
  />
);

registerRoot(Root);
