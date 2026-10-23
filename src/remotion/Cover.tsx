import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { hookParts } from "../shared/hookText";
import type { CoverProps } from "../shared/types";
import { getFont, registerCustomFonts } from "./fonts";
import { accentStyle } from "./Hook";

export const COVER_SIZE = { width: 1080, height: 1920 };
// The profile grid shows the middle 3:4 of a reel cover, so the words stay inside it.
export const GRID_CROP = { top: 240, height: 1440 };

const fontStyle = (name: string) => {
  const f = getFont(name);
  return { fontFamily: f.fontFamily, fontWeight: f.fontWeight, fontStyle: f.fontStyle };
};

// The reel's cover: the chosen frame with the title in the brand's fonts and colors.
export const Cover: React.FC<CoverProps> = ({ background, title, sub, design, style, customFonts }) => {
  registerCustomFonts(customFonts ?? []);
  const words = title.replace(/\*/g, "").length;
  const size = words > 48 ? 92 : words > 28 ? 112 : 136;
  const titleText = hookParts(title).map((part, i) =>
    part.accent ? (
      <span key={i} style={accentStyle(style, true)}>
        {part.text}
      </span>
    ) : (
      <React.Fragment key={i}>{part.text}</React.Fragment>
    ),
  );
  const subLine = sub.trim() ? (
    <div style={{ ...fontStyle(style.font), fontSize: 44, lineHeight: 1.2, marginTop: 22, letterSpacing: "0.02em" }}>{sub}</div>
  ) : null;
  const photo = background ? <Img src={background} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null;

  if (design === "split") {
    return (
      <AbsoluteFill style={{ background: style.highlightColor }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1130, overflow: "hidden" }}>{photo}</div>
        <div
          style={{
            position: "absolute", left: 70, right: 70, top: 1180, bottom: GRID_CROP.top + 20,
            display: "flex", flexDirection: "column", justifyContent: "center",
            color: style.highlightTextColor, textWrap: "balance",
          }}
        >
          <div style={{ ...fontStyle(style.displayFont), fontSize: size * 0.85, lineHeight: 1 }}>{title.replace(/\*/g, "")}</div>
          {subLine}
        </div>
      </AbsoluteFill>
    );
  }

  const block = design === "block";
  return (
    <AbsoluteFill style={{ background: "#111014" }}>
      {photo}
      {design === "plain" ? null : (
        <>
          <AbsoluteFill style={{ background: "linear-gradient(transparent 45%, rgba(0,0,0,0.55) 85%)" }} />
          <div
            style={{
              position: "absolute", left: 70, right: 70, bottom: GRID_CROP.top + 70,
              textAlign: "center", textWrap: "balance",
              color: block ? style.highlightTextColor : style.hookColor,
              textShadow: block ? "none" : "0 4px 30px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ ...fontStyle(style.displayFont), fontSize: size, lineHeight: 1.05 }}>
              {block ? (
                <span
                  style={{
                    background: style.highlightColor, padding: "0.04em 0.22em", borderRadius: 14, lineHeight: 1.3,
                    boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
                  }}
                >
                  {title.replace(/\*/g, "")}
                </span>
              ) : (
                titleText
              )}
            </div>
            <div style={{ color: style.textColor, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>{subLine}</div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
