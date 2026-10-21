import type { BrandKit } from "./types";

// Placeholder brand until the real colors and fonts are added in the editor.
export const DEFAULT_BRAND: BrandKit = {
  name: "My Brand",
  font: "DM Sans",
  displayFont: "Instrument Serif",
  hookColor: "#F6E7A1",
  hookDurationMs: 5000,
  textColor: "#FFFFFF",
  outlineColor: "#000000",
  highlightColor: "#F6E7A1",
  highlightTextColor: "#1F1B18",
  style: "clean",
  position: "bottom",
  wordsPerLine: 4,
  uppercase: false,
  fontSize: 64,
};

// Swatches offered in the color pickers.
export const SWATCHES = ["#FFFFFF", "#F6E7A1", "#F3EAD7", "#F2B8C6", "#FF3EA5", "#E5322D", "#9BC1E6", "#1F1B18"];
