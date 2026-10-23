import { plainHook } from "../shared/hookText";
import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { BrollReelProps } from "../shared/types";
import { getFont, registerCustomFonts } from "./fonts";

export const BROLL_FPS = 30;
export const brollFrames = (lengthMs: number) => Math.max(1, Math.round((lengthMs / 1000) * BROLL_FPS));

// A trial reel made from b-roll: clips cut back to back (each from its middle), with the
// hook big in the middle of the screen the whole time and a nudge to read the caption.
export const BrollReel: React.FC<BrollReelProps> = ({ clips, hookText, hookSubText, style, lengthMs, music, customFonts }) => {
  registerCustomFonts(customFonts ?? []);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = brollFrames(lengthMs);
  const per = clips.length ? Math.ceil(total / clips.length) : total;
  const display = getFont(style.displayFont);
  const body = getFont(style.font);
  const enter = spring({ frame: frame + 8, fps, config: { damping: 16, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#16121F" }}>
      {clips.map((c, i) => {
        const clipFrames = Math.round((c.durationMs / 1000) * fps);
        const start = Math.max(0, Math.round((clipFrames - per) / 2));
        return (
          <Sequence key={i} from={i * per} durationInFrames={per} premountFor={fps}>
            <OffthreadVideo
              src={c.src}
              muted
              trimBefore={start}
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.04 + 0.04 * ((frame - i * per) / per)})` }}
            />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.25) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 70px", textAlign: "center" }}>
        {/* A soft dark panel keeps the hook readable over any footage. */}
        <div style={{ padding: "48px 56px", borderRadius: 48, background: "rgba(14, 10, 22, 0.42)", backdropFilter: "blur(10px)", opacity: enter }}>
        <div
          style={{
            fontFamily: display.fontFamily,
            fontWeight: display.fontWeight,
            fontStyle: display.fontStyle,
            fontSize: plainHook(hookText).length > 40 ? 92 : 112,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            color: style.hookColor,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
            textWrap: "balance",
            opacity: enter,
            transform: `translateY(${(1 - enter) * 24}px)`,
          }}
        >
          {plainHook(hookText)}
        </div>
        {hookSubText ? (
          <div
            style={{
              fontFamily: body.fontFamily,
              fontWeight: body.fontWeight,
              fontStyle: body.fontStyle,
              fontSize: 44,
              marginTop: 26,
              color: style.textColor,
              textShadow: "0 2px 14px rgba(0,0,0,0.5)",
              opacity: frame > fps * 1.2 ? 1 : 0,
            }}
          >
            {hookSubText}
          </div>
        ) : null}
        </div>
      </AbsoluteFill>
      {music ? <Audio src={music.src} volume={music.volume} loop /> : null}
    </AbsoluteFill>
  );
};
