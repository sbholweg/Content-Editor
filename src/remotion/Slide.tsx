import React from "react";
import { AbsoluteFill, Img } from "remotion";
import type { SlideProps } from "../shared/types";
import { getFont, registerCustomFonts } from "./fonts";

export const CAROUSEL_SIZE = { width: 1080, height: 1350 };
export const STORY_SIZE = { width: 1080, height: 1920 };

// A carousel slide or story frame: a still from the reel, darkened toward the bottom, with the
// text in the reel's fonts and colors.
export const SlideCard: React.FC<SlideProps> = ({ slide, format, style, background, customFonts }) => {
  registerCustomFonts(customFonts ?? []);
  const base = getFont(style.font);
  const display = getFont(style.displayFont);
  const story = format === "stories";
  const cover = slide.kind === "cover";
  const titleSize = slide.title.length > 14 ? (story ? 130 : 120) : story ? 190 : 180;

  return (
    <AbsoluteFill style={{ backgroundColor: "#1E1533" }}>
      {background ? <Img src={background} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      <AbsoluteFill
        style={{
          background: story
            ? "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.75) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.75) 75%, rgba(0,0,0,0.85) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: story ? "center" : "flex-start",
          textAlign: story ? "center" : "left",
          // Stories keep clear of Instagram's reply bar at the bottom.
          padding: story ? "0 90px 470px" : "0 80px 120px",
          color: style.textColor,
          textShadow: "0 2px 12px rgba(0,0,0,0.35)",
        }}
      >
        {slide.eyebrow ? (
          <div style={{ fontFamily: base.fontFamily, fontWeight: base.fontWeight, fontStyle: base.fontStyle, fontSize: story ? 60 : 46, lineHeight: 1.1 }}>
            {slide.eyebrow}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: display.fontFamily,
            fontWeight: display.fontWeight,
            fontStyle: display.fontStyle,
            fontSize: cover ? titleSize * 0.8 : titleSize,
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            color: cover ? style.hookColor : style.highlightColor,
            margin: "6px 0 18px",
            textWrap: "balance",
          }}
        >
          {slide.title}
        </div>
        {slide.body ? (
          <div
            style={{
              fontFamily: base.fontFamily,
              fontWeight: base.fontWeight,
              fontStyle: base.fontStyle,
              fontSize: story ? 48 : 38,
              lineHeight: 1.3,
              opacity: 0.92,
              maxWidth: 880,
            }}
          >
            {slide.body}
          </div>
        ) : null}
        {slide.pills.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 26, justifyContent: story ? "center" : "flex-start" }}>
            {slide.pills.map((p) => (
              <span
                key={p}
                style={{
                  fontFamily: base.fontFamily,
                  fontWeight: base.fontWeight,
                  fontSize: 32,
                  padding: "10px 22px",
                  borderRadius: 999,
                  border: `3px solid ${style.highlightColor}`,
                  color: style.textColor,
                  textShadow: "none",
                  background: "rgba(0,0,0,0.25)",
                }}
              >
                {p}
              </span>
            ))}
          </div>
        ) : null}
        {cover && !story ? (
          <div style={{ fontFamily: base.fontFamily, fontWeight: base.fontWeight, fontSize: 34, marginTop: 30, opacity: 0.85 }}>swipe →</div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
