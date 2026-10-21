import React from "react";
import { Composition, registerRoot } from "remotion";
import { DEFAULT_STYLE } from "../shared/brand";
import type { ReelProps, SlideProps } from "../shared/types";
import { outputFrames, Reel, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from "./Reel";
import { CAROUSEL_SIZE, SlideCard, STORY_SIZE } from "./Slide";

const defaultProps: ReelProps = { videoSrc: "", hookText: "", words: [], brand: DEFAULT_STYLE, durationMs: 3000, removePauses: false, overlays: [], hookSubText: "", sounds: [], music: null, customFonts: [] };

const sampleSlide: SlideProps = {
  slide: { id: "s", kind: "point", eyebrow: "reason one: your", title: "hook", body: "", pills: [], frameMs: 0 },
  format: "carousel",
  style: DEFAULT_STYLE,
  background: "",
  customFonts: [],
};

const Root: React.FC = () => (
  <>
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
    <Composition id="CarouselSlide" component={SlideCard} {...CAROUSEL_SIZE} fps={30} durationInFrames={1} defaultProps={sampleSlide} />
    <Composition id="StoryFrame" component={SlideCard} {...STORY_SIZE} fps={30} durationInFrames={1} defaultProps={{ ...sampleSlide, format: "stories" }} />
  </>
);

registerRoot(Root);
