import { DEFAULT_STYLE } from "./brand";
import type { ReelStyle } from "./types";

type StarterLook = { id: string; name: string; note: string; style: ReelStyle };

const look = (id: string, name: string, note: string, style: Partial<ReelStyle>): StarterLook => ({
  id,
  name,
  note,
  style: { ...DEFAULT_STYLE, ...style },
});

// Ready-made looks to start from. Tapping one applies it to the reel; tweak from there.
export const STARTER_LOOKS: StarterLook[] = [
  look("golden-hour", "Golden Hour", "serif captions, soft yellow key words, zoom jumps", {
    font: "Instrument Serif (upright)", displayFont: "Instrument Serif (upright)", fontSize: 76, hookPosition: "top", hookLayout: "headline",
    hookDurationMs: 3000, highlightColor: "#F6E7A1", style: "color", captionMode: "phrase", wordsPerLine: 3, textEffect: "shadow",
    position: "top", zoomJumps: true,
  }),
  look("side-note", "Side Note", "one word at a time, beside your head", {
    font: "Instrument Serif (upright)", displayFont: "Instrument Serif (upright)", fontSize: 80, hookPosition: "top",
    highlightColor: "#F6E7A1", style: "serif", captionMode: "single", textEffect: "shadow", position: "top", captionAlign: "right", zoomJumps: true,
  }),
  look("main-character", "Main Character", "one big word at a time, bubbles", {
    font: "Montserrat", displayFont: "Anton", fontSize: 80, hookLayout: "eyebrow", hookDurationMs: 3000, outlineColor: "#000000",
    highlightColor: "#7C4DFF", highlightTextColor: "#FFFFFF", style: "pill", captionMode: "single", textEffect: "outline",
    position: "middle", uppercase: true, zoomJumps: true,
  }),
  look("hot-take", "Hot Take", "loud yellow caps, made to stop the scroll", {
    font: "Anton", displayFont: "Anton", fontSize: 92, hookLayout: "headline", hookColor: "#FFE14D", hookDurationMs: 3000,
    outlineColor: "#000000", highlightColor: "#FFE14D", style: "color", captionMode: "single", textEffect: "outline",
    position: "middle", uppercase: true, zoomJumps: true,
  }),
  look("soft-launch", "Soft Launch", "calm, lavender serif key words, low captions", {
    font: "DM Sans", displayFont: "Fraunces", fontSize: 60, hookLayout: "subhead", hookDurationMs: 5000,
    highlightColor: "#E4D7FF", style: "serif", captionMode: "phrase", wordsPerLine: 4, textEffect: "shadow", position: "bottom",
  }),
  look("clean-girl", "Clean Girl", "minimal lowercase, barely-there", {
    font: "Inter", displayFont: "Inter", fontSize: 56, hookLayout: "headline", hookDurationMs: 4000,
    highlightColor: "#FFFFFF", style: "color", captionMode: "phrase", wordsPerLine: 5, textEffect: "shadow", position: "bottom",
  }),
  look("pop-star", "Pop Star", "pink bubbles, playful and bright", {
    font: "Poppins", displayFont: "Shrikhand", fontSize: 70, hookLayout: "headline", hookColor: "#FFFFFF", hookDurationMs: 3000,
    highlightColor: "#FF5FB2", highlightTextColor: "#FFFFFF", style: "pill", captionMode: "phrase", wordsPerLine: 3,
    textEffect: "shadow", position: "middle", zoomJumps: true,
  }),
  look("magazine", "Magazine", "Vogue-style serif with small caps eyebrow", {
    font: "Raleway", displayFont: "Bodoni Moda (upright)", fontSize: 58, hookLayout: "eyebrow", hookDurationMs: 0,
    highlightColor: "#FFFFFF", style: "serif", captionMode: "phrase", wordsPerLine: 4, textEffect: "shadow", position: "bottom", uppercase: false,
  }),
  look("notes-app", "Notes App", "typewriter captions, honest and diary-like", {
    font: "Courier Prime", displayFont: "Courier Prime", fontSize: 58, hookLayout: "headline", hookDurationMs: 4000,
    outlineColor: "#000000", highlightColor: "#FFE14D", style: "color", captionMode: "phrase", wordsPerLine: 4, textEffect: "outline", position: "bottom",
  }),
];
