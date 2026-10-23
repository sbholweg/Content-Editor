import React from "react";
import { Composition, registerRoot } from "remotion";
import { DEFAULT_STYLE } from "../shared/brand";
import type { BrollReelProps, CoverProps, ReelProps, SlideProps } from "../shared/types";
import { outputFrames, Reel, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from "./Reel";
import { BROLL_FPS, brollFrames, BrollReel } from "./BrollReel";
import { CAROUSEL_SIZE, SlideCard, STORY_SIZE } from "./Slide";
import { Cover, COVER_SIZE } from "./Cover";

const defaultProps: ReelProps = { videoSrc: "", hookText: "", words: [], brand: DEFAULT_STYLE, durationMs: 3000, removePauses: false, silences: [], overlays: [], hookSubText: "", sounds: [], music: null, customFonts: [], logoSrc: "" };

const sampleSlide: SlideProps = {
  slide: { id: "s", kind: "point", eyebrow: "reason one: your", title: "hook", body: "", pills: [], frameMs: 0 },
  format: "carousel",
  style: DEFAULT_STYLE,
  design: "photo",
  colors: { background: "#FAFAF9", text: "#16121F", primary: DEFAULT_STYLE.highlightColor },
  background: "",
  customFonts: [],
};

const sampleBroll: BrollReelProps = { clips: [], hookText: "", hookSubText: "", style: DEFAULT_STYLE, lengthMs: 7000, music: null, customFonts: [] };

const sampleCover: CoverProps = { background: "", title: "your *hook* here", sub: "", design: "headline", style: DEFAULT_STYLE, customFonts: [] };

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
    <Composition
      id="BrollReel"
      component={BrollReel}
      width={REEL_WIDTH}
      height={REEL_HEIGHT}
      fps={BROLL_FPS}
      durationInFrames={brollFrames(sampleBroll.lengthMs)}
      defaultProps={sampleBroll}
      calculateMetadata={({ props }) => ({ durationInFrames: brollFrames(props.lengthMs) })}
    />
    <Composition id="CarouselSlide" component={SlideCard} {...CAROUSEL_SIZE} fps={30} durationInFrames={1} defaultProps={sampleSlide} />
    <Composition id="StoryFrame" component={SlideCard} {...STORY_SIZE} fps={30} durationInFrames={1} defaultProps={{ ...sampleSlide, format: "stories" }} />
    <Composition id="Cover" component={Cover} {...COVER_SIZE} fps={30} durationInFrames={1} defaultProps={sampleCover} />
  </>
);

registerRoot(Root);
