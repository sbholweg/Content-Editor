import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReelStyle } from "../shared/types";
import { getFont } from "./fonts";

// Where the hook's center sits. "bottom" stays above the area Instagram covers with its caption and buttons.
export const HOOK_TOP: Record<ReelStyle["hookPosition"], number> = {
  top: 13,
  middle: 42,
  bottom: 62,
};

const SHADOW = "0 2px 8px rgba(0,0,0,0.35), 0 6px 40px rgba(0,0,0,0.35)";

// The title on the reel ("nobody's saying it, so I will"), optionally with a smaller second line:
// above it ("eyebrow") or below it ("subhead").
export const Hook: React.FC<{ text: string; subText: string; brand: ReelStyle }> = ({ text, subText, brand }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const font = getFont(brand.displayFont);
  const small = getFont(brand.font);
  if (!text.trim()) return null;

  const endFrame = brand.hookDurationMs > 0 ? Math.round((brand.hookDurationMs / 1000) * fps) : durationInFrames;
  if (frame >= endFrame) return null;

  // Starts partway into its animation so the very first frame (often the reel's cover) already shows the hook.
  const enter = spring({ frame: frame + 10, fps, config: { damping: 16, stiffness: 120 } });
  const exit = interpolate(frame, [endFrame - 8, endFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const layout = subText.trim() ? brand.hookLayout : "headline";
  const second = (
    <div
      style={{
        fontFamily: small.fontFamily,
        fontWeight: small.fontWeight,
        fontStyle: small.fontStyle,
        fontSize: layout === "eyebrow" ? 38 : 46,
        letterSpacing: layout === "eyebrow" ? "0.14em" : "0.01em",
        textTransform: layout === "eyebrow" ? "uppercase" : "none",
        lineHeight: 1.15,
        color: brand.textColor,
        margin: layout === "eyebrow" ? "0 0 14px" : "16px 0 0",
      }}
    >
      {subText}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        top: `${HOOK_TOP[brand.hookPosition]}%`,
        left: 90,
        right: 90,
        textAlign: "center",
        textShadow: SHADOW,
        opacity: enter * exit,
        transform: `translateY(calc(-50% + ${(1 - enter) * 30}px))`,
        textWrap: "balance",
      }}
    >
      {layout === "eyebrow" ? second : null}
      <div
        style={{
          fontFamily: font.fontFamily,
          fontWeight: font.fontWeight,
          fontStyle: font.fontStyle,
          fontSize: 96,
          lineHeight: 1.02,
          color: brand.hookColor,
        }}
      >
        {text}
      </div>
      {layout === "subhead" ? second : null}
    </div>
  );
};
