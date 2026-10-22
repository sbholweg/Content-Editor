import React from "react";
import { AbsoluteFill, Img } from "remotion";
import type { SlideProps } from "../shared/types";
import { getFont, registerCustomFonts } from "./fonts";

export const CAROUSEL_SIZE = { width: 1080, height: 1350 };
export const STORY_SIZE = { width: 1080, height: 1920 };

const fontStyle = (name: string) => {
  const f = getFont(name);
  return { fontFamily: f.fontFamily, fontWeight: f.fontWeight, fontStyle: f.fontStyle };
};

// A carousel slide or story frame in one of four designs, using the reel's fonts and the
// brand's colors.
export const SlideCard: React.FC<SlideProps> = ({ slide, format, style, design = "photo", colors, background, customFonts }) => {
  registerCustomFonts(customFonts ?? []);
  const story = format === "stories";
  const cover = slide.kind === "cover";
  const c = colors ?? { background: "#FAFAF9", text: "#16121F", primary: style.highlightColor };
  const titleSize = slide.title.length > 14 ? (story ? 130 : 120) : story ? 190 : 180;
  const onPhoto = design === "photo";
  const ink = onPhoto ? style.textColor : design === "bold" ? "#FFFFFF" : c.text;
  const titleColor = onPhoto ? (cover ? style.hookColor : style.highlightColor) : design === "bold" ? "#FFFFFF" : c.primary;
  const pageBg = design === "bold" ? c.primary : design === "photo" ? "#16121F" : c.background;

  const text = (
    <>
      {slide.eyebrow ? <div style={{ ...fontStyle(style.font), fontSize: story ? 60 : 46, lineHeight: 1.1, color: ink }}>{slide.eyebrow}</div> : null}
      <div
        style={{
          ...fontStyle(style.displayFont),
          fontSize: cover ? titleSize * 0.8 : titleSize,
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          color: titleColor,
          margin: "6px 0 18px",
          textWrap: "balance",
        }}
      >
        {slide.title}
      </div>
      {slide.body ? (
        <div style={{ ...fontStyle(style.font), fontSize: story ? 48 : 38, lineHeight: 1.3, opacity: 0.92, maxWidth: 880, color: ink }}>{slide.body}</div>
      ) : null}
      {slide.pills.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 26, justifyContent: story ? "center" : "flex-start" }}>
          {slide.pills.map((p) => (
            <span
              key={p}
              style={{
                ...fontStyle(style.font),
                fontSize: 32,
                padding: "10px 22px",
                borderRadius: 999,
                border: `3px solid ${titleColor}`,
                color: ink,
                textShadow: "none",
                background: onPhoto ? "rgba(0,0,0,0.25)" : "transparent",
              }}
            >
              {p}
            </span>
          ))}
        </div>
      ) : null}
      {cover && !story ? <div style={{ ...fontStyle(style.font), fontSize: 34, marginTop: 30, opacity: 0.85, color: ink }}>swipe →</div> : null}
    </>
  );

  if (design === "framed") {
    return (
      <AbsoluteFill style={{ backgroundColor: pageBg, padding: story ? "120px 80px 380px" : "70px 70px 80px", gap: 44, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: story ? "0 0 52%" : "0 0 54%", borderRadius: 44, overflow: "hidden", background: "#ddd", boxShadow: "0 30px 60px -30px rgba(0,0,0,0.4)" }}>
          {background ? <Img src={background} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: story ? "center" : "flex-start", textAlign: story ? "center" : "left" }}>{text}</div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: pageBg }}>
      {onPhoto && background ? <Img src={background} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      {onPhoto ? (
        <AbsoluteFill
          style={{
            background: story
              ? "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.75) 100%)"
              : "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.75) 75%, rgba(0,0,0,0.85) 100%)",
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          justifyContent: onPhoto ? "flex-end" : "center",
          alignItems: story ? "center" : "flex-start",
          textAlign: story ? "center" : "left",
          // Stories keep clear of Instagram's reply bar at the bottom.
          padding: story ? (onPhoto ? "0 90px 470px" : "0 90px 200px") : onPhoto ? "0 80px 120px" : "0 90px",
          textShadow: onPhoto ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
        }}
      >
        {text}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
