import React from "react";
import { Audio, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
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
// A line that types on: every character keeps its place (so the line never jumps), unrevealed
// ones are invisible, and a caret blinks at the end while it's typing.
const Typed: React.FC<{ times: ReturnType<typeof typeTimes>; ms: number; color: string }> = ({ times, ms, color }) => {
  const shown = times.filter((t) => t.atMs <= ms).length;
  const typing = shown < times.length;
  return (
    <>
      {times.map((t, i) => (
        <span key={i} style={{ opacity: i < shown ? 1 : 0 }}>
          {t.char}
          {typing && i === shown - 1 ? <span style={{ position: "absolute", marginLeft: 2, color, opacity: Math.floor(ms / 400) % 2 ? 0.2 : 1 }}>|</span> : null}
        </span>
      ))}
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
  const times = typewriter ? typeTimes(typed.text, typed.startMs, (endFrame / fps) * 1000) : [];
  const subContent = typewriter && typed.line === "sub" ? <Typed times={times} ms={ms} color={brand.textColor} /> : subText;
  const mainContent = typewriter && typed.line === "main" ? <Typed times={times} ms={ms} color={brand.hookColor} /> : text;
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
