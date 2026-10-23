import React from "react";
import { Audio, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { hookParts, plainHook } from "../shared/hookText";
import { typedLine, typeTimes } from "../shared/typewriter";
import { SFX_MIX } from "./Sounds";
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
// The style for *starred* hook words: the brand's accent font, in a block of the key color (or
// just colored), so one word carries the brand's signature like on a brand board.
function accentStyle(brand: ReelStyle, visible: boolean): React.CSSProperties {
  const accent = getFont(brand.accentFont || "Instrument Serif");
  const base: React.CSSProperties = { fontFamily: accent.fontFamily, fontWeight: accent.fontWeight, fontStyle: accent.fontStyle, fontSize: "1.06em" };
  if (brand.hookAccent === "color") return { ...base, color: brand.highlightColor };
  return {
    ...base,
    color: brand.highlightTextColor,
    background: visible ? brand.highlightColor : "transparent",
    textShadow: "none",
    padding: "0 0.14em",
    borderRadius: "0.12em",
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
  };
}

// A hook line, with any *starred* words in the accent style. When typing on, every character keeps
// its place (so the line never jumps), unrevealed ones are invisible, and a caret blinks at the end.
const HookLine: React.FC<{ text: string; brand: ReelStyle; times?: ReturnType<typeof typeTimes>; ms?: number; caretColor: string }> = ({
  text, brand, times, ms = 0, caretColor,
}) => {
  const shown = times ? times.filter((t) => t.atMs <= ms).length : Infinity;
  const typing = times ? shown < times.length : false;
  let index = 0;
  return (
    <>
      {hookParts(text).map((part, p) => {
        const first = index;
        const chars = [...part.text].map((c) => {
          const i = index++;
          return (
            <span key={i} style={{ opacity: i < shown ? 1 : 0 }}>
              {c}
              {typing && i === shown - 1 ? <span style={{ position: "absolute", marginLeft: 2, color: caretColor, opacity: Math.floor(ms / 400) % 2 ? 0.2 : 1 }}>|</span> : null}
            </span>
          );
        });
        return part.accent ? (
          <span key={p} style={accentStyle(brand, first < shown)}>
            {chars}
          </span>
        ) : (
          <React.Fragment key={p}>{chars}</React.Fragment>
        );
      })}
    </>
  );
};

export const Hook: React.FC<{ text: string; subText: string; brand: ReelStyle; typingSounds?: string[] }> = ({ text, subText, brand, typingSounds = [] }) => {
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
  const ms = (frame / fps) * 1000;
  const typewriter = brand.hookAnimation === "typewriter";
  const typed = typedLine(text, layout === "headline" ? "" : subText);
  const times = typewriter ? typeTimes(plainHook(typed.text), typed.startMs, (endFrame / fps) * 1000) : [];
  const typedSub = typewriter && typed.line === "sub";
  const typedMain = typewriter && typed.line === "main";
  const subContent = <HookLine text={subText} brand={brand} times={typedSub ? times : undefined} ms={ms} caretColor={brand.textColor} />;
  const mainContent = <HookLine text={text} brand={brand} times={typedMain ? times : undefined} ms={ms} caretColor={brand.hookColor} />;
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
      {subContent}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        top: `${brand.hookPlace?.y ?? HOOK_TOP[brand.hookPosition]}%`,
        left: `${brand.hookPlace?.x ?? 50}%`,
        width: 900,
        textAlign: "center",
        textShadow: SHADOW,
        opacity: enter * exit,
        transform: `translate(-50%, calc(-50% + ${(1 - enter) * 30}px))`,
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
        {mainContent}
      </div>
      {layout === "subhead" ? second : null}
      {/* A soft key click as each letter appears (spaces are silent). */}
      {typewriter && typingSounds.length
        ? times.map((t, i) =>
            t.click ? (
              <Sequence key={i} from={Math.round((t.atMs / 1000) * fps)} durationInFrames={Math.round(fps * 0.3)} layout="none">
                <Audio src={typingSounds[i % typingSounds.length]} volume={0.55 * SFX_MIX} />
              </Sequence>
            ) : null,
          )
        : null}
    </div>
  );
};
