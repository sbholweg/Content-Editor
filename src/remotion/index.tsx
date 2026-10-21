import React from "react";
import { Composition, registerRoot } from "remotion";
import { DEFAULT_STYLE } from "../shared/brand";
import type { ReelProps } from "../shared/types";
import { outputFrames, Reel, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from "./Reel";

const defaultProps: ReelProps = { videoSrc: "", hookText: "", words: [], brand: DEFAULT_STYLE, durationMs: 3000, removePauses: false };

const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={REEL_WIDTH}
    height={REEL_HEIGHT}
    fps={REEL_FPS}
    durationInFrames={outputFrames(defaultProps)}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => ({ durationInFrames: outputFrames(props) })}
  />
);

registerRoot(Root);
