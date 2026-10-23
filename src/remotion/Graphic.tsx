import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReelGraphic, ReelStyle } from "../shared/types";
import { getFont } from "./fonts";

const INK = "#111014";

// Splits "$1,200+" into "$", 1200 and "+" so the number can count up while the rest stays put.
export function splitNumber(text: string) {
  const m = text.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], value: Number(m[2].replace(/,/g, "")), decimals: m[2].split(".")[1]?.length ?? 0, commas: m[2].includes(","), suffix: m[3] };
}

// Graphics drawn in the creator's brand: their highlight color, fonts and a hard ink shadow.
export const Graphic: React.FC<{ graphic: ReelGraphic; brand: ReelStyle }> = ({ graphic, brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const display = getFont(brand.displayFont);
  const body = getFont(brand.font);
  const accent = brand.highlightColor;
  const onAccent = brand.highlightTextColor;

  if (graphic.kind === "sticker") {
    return (
      <div
        style={{
          transform: "rotate(-4deg)", background: accent, color: onAccent, border: `6px solid ${INK}`, borderRadius: 18,
          boxShadow: `12px 12px 0 ${INK}`, padding: "18px 34px", fontFamily: body.fontFamily, fontWeight: 800,
          fontSize: 54, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap", lineHeight: 1.1,
        }}
      >
        {graphic.text}
      </div>
    );
  }

  if (graphic.kind === "stat") {
    const parts = splitNumber(graphic.text);
    const progress = interpolate(frame, [0, Math.round(fps * 0.9)], [0, 1], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
    const shown = parts
      ? `${parts.prefix}${(parts.value * progress).toLocaleString("en-US", {
          minimumFractionDigits: parts.decimals,
          maximumFractionDigits: parts.decimals,
          useGrouping: parts.commas || parts.value >= 10000,
        })}${parts.suffix}`
      : graphic.text;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
        <div
          style={{
            fontFamily: display.fontFamily, fontWeight: display.fontWeight, fontStyle: display.fontStyle, fontSize: 210, lineHeight: 0.95,
            color: accent, WebkitTextStroke: `6px ${INK}`, paintOrder: "stroke fill", textShadow: `10px 10px 0 ${INK}`, whiteSpace: "nowrap",
          }}
        >
          {shown}
        </div>
        {graphic.sub ? (
          <div style={{ background: INK, color: "#fff", fontFamily: body.fontFamily, fontWeight: 700, fontSize: 44, padding: "8px 22px", borderRadius: 12, maxWidth: 800 }}>
            {graphic.sub}
          </div>
        ) : null}
      </div>
    );
  }

  // cta: an Instagram-style comment bubble with the keyword in a highlight pill.
  return (
    <div style={{ position: "relative", background: "#fff", color: INK, borderRadius: 40, padding: "26px 40px", boxShadow: `10px 10px 0 ${INK}`, border: `5px solid ${INK}`, textAlign: "center" }}>
      <div style={{ fontFamily: body.fontFamily, fontWeight: 700, fontSize: 40, opacity: 0.75 }}>{graphic.sub || "Comment"}</div>
      <div
        style={{
          marginTop: 8, display: "inline-block", background: accent, color: onAccent, padding: "4px 26px", borderRadius: 18,
          fontFamily: display.fontFamily, fontWeight: display.fontWeight, fontStyle: display.fontStyle, fontSize: 100, lineHeight: 1.05, textTransform: "uppercase",
        }}
      >
        {graphic.text}
      </div>
      <div style={{ position: "absolute", left: 60, bottom: -34, width: 0, height: 0, borderLeft: "20px solid transparent", borderRight: "26px solid transparent", borderTop: `34px solid ${INK}` }} />
    </div>
  );
};

// Where each kind sits by default (center, % down the frame): above the head or on the chest, so it
// never covers the face (talking heads sit around 30-60% down), and clear of the captions (72%)
// and Instagram's buttons.
export const GRAPHIC_Y: Record<ReelGraphic["kind"], number> = { sticker: 19, stat: 21, cta: 62 };
