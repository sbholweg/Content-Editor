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
// Hand-drawn marks, drawn on over about half a second (paths are a little wobbly on purpose).
const MARKS = {
  circle: { box: "0 0 220 120", d: "M28 64 C24 28 120 10 178 26 C214 36 214 86 160 102 C104 118 30 106 20 72 C14 52 40 30 70 24" },
  arrow: { box: "0 0 220 120", d: "M18 96 C70 92 120 70 168 30 M140 28 L170 26 L166 56" },
  underline: { box: "0 0 220 40", d: "M10 26 C60 16 120 30 210 18" },
} as const;

const Mark: React.FC<{ kind: keyof typeof MARKS; color: string; width: number }> = ({ kind, color, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drawn = interpolate(frame, [0, Math.round(fps * 0.5)], [0, 1], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 2) });
  const m = MARKS[kind];
  const [, , w, h] = m.box.split(" ").map(Number);
  return (
    <svg viewBox={m.box} width={width} height={(width * h) / w} style={{ overflow: "visible", filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" }}>
      <path d={m.d} fill="none" stroke={color} strokeWidth={kind === "underline" ? 9 : 7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - drawn} />
    </svg>
  );
};

// Brand elements: simple bold shapes in the key color with an ink outline, like a brand board.
export const ELEMENTS: Record<string, { label: string; box: string; d: string }> = {
  bolt: { label: "⚡ Bolt", box: "0 0 24 40", d: "M15 0 L2 23 H11 L8 40 L22 15 H13 Z" },
  starburst: { label: "✸ Starburst", box: "0 0 100 100", d: "M50 0 L58.4 29.7 L85.4 14.6 L70.3 41.6 L100 50 L70.3 58.4 L85.4 85.4 L58.4 70.3 L50 100 L41.6 70.3 L14.6 85.4 L29.7 58.4 L0 50 L29.7 41.6 L14.6 14.6 L41.6 29.7 Z" },
  sparkle: { label: "✦ Sparkle", box: "0 0 100 100", d: "M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0Z" },
  heart: { label: "♥ Heart", box: "0 0 100 90", d: "M50 88 C20 66 2 48 2 28 C2 12 14 2 28 2 C38 2 46 8 50 16 C54 8 62 2 72 2 C86 2 98 12 98 28 C98 48 80 66 50 88 Z" },
  star: { label: "★ Star", box: "0 0 100 96", d: "M50 2 L62 36 L98 37 L69 59 L80 94 L50 73 L20 94 L31 59 L2 37 L38 36 Z" },
};

const Element: React.FC<{ name: string; color: string; width: number }> = ({ name, color, width }) => {
  const frame = useCurrentFrame();
  const el = ELEMENTS[name] ?? ELEMENTS.sparkle;
  const [, , w, h] = el.box.split(" ").map(Number);
  // A gentle wobble so it feels alive, not pasted on.
  const wobble = Math.sin(frame / 7) * 4;
  return (
    <svg viewBox={el.box} width={width} height={(width * h) / w} style={{ overflow: "visible", transform: `rotate(${wobble}deg)`, filter: "drop-shadow(5px 5px 0 #111014)" }}>
      <path d={el.d} fill={color} stroke="#111014" strokeWidth={w / 40} strokeLinejoin="round" />
    </svg>
  );
};

// The closing card: the call to action big in the hook font, in the brand's colors.
export const EndCardView: React.FC<{ text: string; sub: string; brand: ReelStyle; logoSrc?: string }> = ({ text, sub, brand, logoSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const display = getFont(brand.displayFont);
  const body = getFont(brand.font);
  const pop = interpolate(frame, [0, Math.round(fps * 0.35)], [0.85, 1], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  return (
    <div style={{ position: "absolute", inset: 0, background: INK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40, padding: 90, textAlign: "center" }}>
      <div style={{ transform: `scale(${pop}) rotate(-2deg)`, background: brand.highlightColor, color: brand.highlightTextColor, padding: "26px 46px", borderRadius: 26, boxShadow: `14px 14px 0 #fff`, fontFamily: display.fontFamily, fontWeight: display.fontWeight, fontStyle: display.fontStyle, fontSize: 104, lineHeight: 1.05, maxWidth: 900 }}>
        {text}
      </div>
      {sub ? <div style={{ color: "#fff", fontFamily: body.fontFamily, fontWeight: 700, fontSize: 48, opacity: interpolate(frame, [6, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{sub}</div> : null}
      {logoSrc ? <img src={logoSrc} style={{ position: "absolute", bottom: 300, width: 170, maxHeight: 120, objectFit: "contain" }} /> : null}
    </div>
  );
};
export const END_CARD_MS = 1800;

export const Graphic: React.FC<{ graphic: ReelGraphic; brand: ReelStyle; width?: number }> = ({ graphic, brand, width = 600 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const display = getFont(brand.displayFont);
  const body = getFont(brand.font);
  const accent = brand.highlightColor;
  const onAccent = brand.highlightTextColor;

  if (graphic.kind === "element") return <Element name={graphic.text} color={graphic.color || brand.highlightColor} width={width} />;

  if (graphic.kind === "circle" || graphic.kind === "arrow" || graphic.kind === "underline") {
    return <Mark kind={graphic.kind} color={graphic.color || brand.highlightColor} width={width} />;
  }

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
export const GRAPHIC_Y: Record<ReelGraphic["kind"], number> = { sticker: 19, stat: 21, cta: 62, circle: 45, arrow: 45, underline: 50, element: 20 };
export const isMark = (kind: ReelGraphic["kind"]) => kind === "circle" || kind === "arrow" || kind === "underline";
