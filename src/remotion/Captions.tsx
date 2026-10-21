import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { buildPages } from "../shared/pages";
import type { BrandKit, Word } from "../shared/types";
import { getFont, type LoadedFont } from "./fonts";
import { HOOK_TOP } from "./Hook";

// Vertical center of the captions, as a percentage of the frame height.
const POSITION_TOP: Record<BrandKit["position"], number> = {
  top: 26,
  middle: 55,
  // Instagram covers the bottom ~20% with the caption and buttons, so "bottom" sits above that.
  bottom: 72,
};
const MIN_GAP_FROM_HOOK = 13;

// While the hook is on screen, nudge the captions so the two never overlap.
function captionTop(brand: BrandKit, hookVisible: boolean) {
  const top = POSITION_TOP[brand.position];
  if (!hookVisible) return top;
  const hook = HOOK_TOP[brand.hookPosition];
  if (Math.abs(top - hook) >= MIN_GAP_FROM_HOOK) return top;
  return hook + MIN_GAP_FROM_HOOK <= 76 ? hook + MIN_GAP_FROM_HOOK : hook - MIN_GAP_FROM_HOOK;
}

function outline(color: string, size: number) {
  const steps = 16;
  const shadows: string[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    shadows.push(`${(Math.cos(a) * size).toFixed(1)}px ${(Math.sin(a) * size).toFixed(1)}px 0 ${color}`);
  }
  shadows.push(`0 ${size * 1.2}px ${size * 2}px rgba(0,0,0,0.45)`);
  return shadows.join(", ");
}

const SOFT_SHADOW = "0 2px 6px rgba(0,0,0,0.45), 0 4px 24px rgba(0,0,0,0.35)";

export const Captions: React.FC<{ words: Word[]; brand: BrandKit; hookText: string }> = ({ words, brand, hookText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  const base = getFont(brand.font);
  const display = getFont(brand.displayFont);

  const single = brand.captionMode === "single";
  const perPage = single ? 1 : brand.wordsPerLine;
  const pages = useMemo(() => buildPages(words, perPage), [words, perPage]);
  const page = pages.find((p) => timeMs >= p.startMs && timeMs < p.endMs);
  if (!page) return null;

  const pageFrame = Math.round((page.startMs / 1000) * fps);
  const pageIn = spring({ frame: frame - pageFrame, fps, config: { damping: 14, stiffness: 180 } });
  const emojiWord = page.words.find((w) => w.emoji && timeMs >= w.startMs);
  const emojiIn = emojiWord
    ? spring({ frame: frame - Math.round((emojiWord.startMs / 1000) * fps), fps, config: { damping: 9, stiffness: 160 } })
    : 0;
  const soft = brand.textEffect === "shadow";
  const fontSize = single ? brand.fontSize * 1.35 : brand.fontSize;
  const hookVisible = hookText.trim() !== "" && (brand.hookDurationMs === 0 || timeMs < brand.hookDurationMs);

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: `${captionTop(brand, hookVisible)}%`,
        transform: `translateY(-50%) scale(${soft && !single ? 1 : 0.85 + 0.15 * pageIn})`,
        opacity: Math.min(1, pageIn * 1.5),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {emojiWord ? (
        <div style={{ fontSize: fontSize * 1.5, transform: `scale(${emojiIn}) rotate(${(1 - emojiIn) * -20}deg)` }}>
          {emojiWord.emoji}
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", columnGap: fontSize * 0.26, rowGap: 4 }}>
        {page.words.map((w) => {
          const spoken = timeMs >= w.startMs;
          const active = spoken && timeMs < w.endMs + 80;
          const wordIn = spring({ frame: frame - Math.round((w.startMs / 1000) * fps), fps, config: { damping: 12, stiffness: 220 } });
          return (
            <CaptionWord key={w.id} word={w} brand={brand} fontSize={fontSize} base={base} display={display} spoken={spoken} active={active} wordIn={spoken ? wordIn : 0} />
          );
        })}
      </div>
    </div>
  );
};

const CaptionWord: React.FC<{
  word: Word;
  brand: BrandKit;
  fontSize: number;
  base: LoadedFont;
  display: LoadedFont;
  spoken: boolean;
  active: boolean;
  wordIn: number;
}> = ({ word, brand, fontSize, base, display, spoken, active, wordIn }) => {
  const text = word.text.trim();
  const soft = brand.textEffect === "shadow";
  const plain: React.CSSProperties = {
    fontFamily: base.fontFamily,
    fontWeight: base.fontWeight,
    fontStyle: base.fontStyle,
    fontSize,
    lineHeight: 1.15,
    color: brand.textColor,
    textShadow: soft ? SOFT_SHADOW : outline(brand.outlineColor, fontSize * 0.07),
    textTransform: brand.uppercase ? "uppercase" : "none",
    transform: soft ? undefined : `scale(${active ? 1 + 0.08 * wordIn : 1})`,
    // With the soft shadow, upcoming words show faintly and brighten as they're spoken.
    opacity: soft ? (spoken ? 1 : 0.55) : 1,
    whiteSpace: "nowrap",
  };

  if (!word.highlight) return <span style={plain}>{text}</span>;

  if (brand.style === "pill") {
    return (
      <span
        style={{
          ...plain,
          opacity: 1,
          color: spoken ? brand.highlightTextColor : brand.textColor,
          textShadow: spoken ? "none" : plain.textShadow,
          background: spoken ? brand.highlightColor : "transparent",
          borderRadius: fontSize * 0.28,
          padding: `${fontSize * 0.04}px ${fontSize * 0.22}px`,
          margin: `0 ${fontSize * 0.06}px`,
          transform: `scale(${1 + 0.1 * wordIn}) rotate(${spoken ? -2 : 0}deg)`,
          boxShadow: spoken ? "0 8px 24px rgba(0,0,0,0.35)" : "none",
        }}
      >
        {text}
      </span>
    );
  }

  if (brand.style === "serif") {
    // Key word swaps into the display (hook) font, a little bigger, in the key word color.
    return (
      <span
        style={{
          ...plain,
          fontFamily: display.fontFamily,
          fontWeight: display.fontWeight,
          fontStyle: display.fontStyle,
          fontSize: fontSize * 1.25,
          textTransform: "none",
          color: spoken ? brand.highlightColor : brand.textColor,
          transform: `translateY(${(1 - wordIn) * 8}px)`,
        }}
      >
        {text}
      </span>
    );
  }

  // "color": same font, the word turns the key word color with a little bounce.
  return (
    <span style={{ ...plain, color: spoken ? brand.highlightColor : brand.textColor, transform: `scale(${1 + 0.12 * wordIn})` }}>
      {text}
    </span>
  );
};
