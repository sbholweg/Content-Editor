import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { buildPages } from "../shared/pages";
import type { BrandKit, Word } from "../shared/types";
import { getFont, type LoadedFont } from "./fonts";

const POSITION_TOP: Record<BrandKit["position"], string> = {
  // Sits under the hook title.
  top: "26%",
  middle: "55%",
  // Instagram covers the bottom ~20% with the caption and buttons, so "bottom" sits above that.
  bottom: "72%",
};

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

export const Captions: React.FC<{ words: Word[]; brand: BrandKit }> = ({ words, brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  const base = getFont(brand.font);
  const display = getFont(brand.displayFont);

  const pages = useMemo(() => buildPages(words, brand.wordsPerLine), [words, brand.wordsPerLine]);
  const page = pages.find((p) => timeMs >= p.startMs && timeMs < p.endMs);
  if (!page) return null;

  const pageFrame = Math.round((page.startMs / 1000) * fps);
  const pageIn = spring({ frame: frame - pageFrame, fps, config: { damping: 14, stiffness: 180 } });
  const emojiWord = page.words.find((w) => w.emoji && timeMs >= w.startMs);
  const emojiIn = emojiWord
    ? spring({ frame: frame - Math.round((emojiWord.startMs / 1000) * fps), fps, config: { damping: 9, stiffness: 160 } })
    : 0;
  const clean = brand.style === "clean";

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: POSITION_TOP[brand.position],
        transform: `translateY(-50%) scale(${clean ? 1 : 0.85 + 0.15 * pageIn})`,
        opacity: Math.min(1, pageIn * 1.5),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {emojiWord ? (
        <div style={{ fontSize: brand.fontSize * 1.5, transform: `scale(${emojiIn}) rotate(${(1 - emojiIn) * -20}deg)` }}>
          {emojiWord.emoji}
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", columnGap: brand.fontSize * 0.26, rowGap: 4 }}>
        {page.words.map((w) => {
          const spoken = timeMs >= w.startMs;
          const active = spoken && timeMs < w.endMs + 80;
          const wordIn = spring({ frame: frame - Math.round((w.startMs / 1000) * fps), fps, config: { damping: 12, stiffness: 220 } });
          return (
            <CaptionWord key={w.id} word={w} brand={brand} base={base} display={display} spoken={spoken} active={active} wordIn={spoken ? wordIn : 0} />
          );
        })}
      </div>
    </div>
  );
};

const CaptionWord: React.FC<{
  word: Word;
  brand: BrandKit;
  base: LoadedFont;
  display: LoadedFont;
  spoken: boolean;
  active: boolean;
  wordIn: number;
}> = ({ word, brand, base, display, spoken, active, wordIn }) => {
  const text = word.text.trim();
  const clean = brand.style === "clean";
  const plain: React.CSSProperties = {
    fontFamily: base.fontFamily,
    fontWeight: base.fontWeight,
    fontStyle: base.fontStyle,
    fontSize: brand.fontSize,
    lineHeight: 1.15,
    color: brand.textColor,
    textShadow: clean ? SOFT_SHADOW : outline(brand.outlineColor, brand.fontSize * 0.07),
    textTransform: brand.uppercase ? "uppercase" : "none",
    transform: clean ? undefined : `scale(${active ? 1 + 0.08 * wordIn : 1})`,
    // Clean style reveals each word as it's spoken instead of popping it.
    opacity: clean ? (spoken ? 1 : 0.55) : 1,
    whiteSpace: "nowrap",
  };

  if (!word.highlight) return <span style={plain}>{text}</span>;

  if (brand.style === "pill") {
    return (
      <span
        style={{
          ...plain,
          color: spoken ? brand.highlightTextColor : brand.textColor,
          textShadow: spoken ? "none" : plain.textShadow,
          background: spoken ? brand.highlightColor : "transparent",
          borderRadius: brand.fontSize * 0.28,
          padding: `${brand.fontSize * 0.04}px ${brand.fontSize * 0.22}px`,
          margin: `0 ${brand.fontSize * 0.06}px`,
          transform: `scale(${1 + 0.1 * wordIn}) rotate(${spoken ? -2 : 0}deg)`,
          boxShadow: spoken ? "0 8px 24px rgba(0,0,0,0.35)" : "none",
        }}
      >
        {text}
      </span>
    );
  }

  if (brand.style === "accent" || brand.style === "clean") {
    // Key word swaps into the statement font, a little bigger, in the highlight color.
    return (
      <span
        style={{
          ...plain,
          fontFamily: display.fontFamily,
          fontWeight: display.fontWeight,
          fontStyle: display.fontStyle,
          fontSize: brand.fontSize * (clean ? 1.25 : 1.3),
          textTransform: "none",
          color: spoken ? brand.highlightColor : brand.textColor,
          transform: clean ? `translateY(${(1 - wordIn) * 8}px)` : `scale(${0.9 + 0.2 * wordIn})`,
        }}
      >
        {text}
      </span>
    );
  }

  // "pop": brand-colored word that punches in when spoken
  return (
    <span style={{ ...plain, color: spoken ? brand.highlightColor : brand.textColor, transform: `scale(${1 + 0.18 * wordIn})` }}>
      {text}
    </span>
  );
};
