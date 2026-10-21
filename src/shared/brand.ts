import type { BrandKit } from "./types";

// Earlier versions stored these key word styles; map them onto the current ones.
const LEGACY_STYLES: Record<string, Pick<BrandKit, "style" | "textEffect">> = {
  clean: { style: "serif", textEffect: "shadow" },
  pop: { style: "color", textEffect: "outline" },
  accent: { style: "serif", textEffect: "outline" },
};

export function normalizeBrand(saved: Partial<BrandKit> & { style?: string }): BrandKit {
  const legacy = saved.style ? LEGACY_STYLES[saved.style] : undefined;
  return { ...DEFAULT_BRAND, ...saved, ...legacy } as BrandKit;
}

// Placeholder brand until the real colors and fonts are added in the editor.
export const DEFAULT_BRAND: BrandKit = {
  name: "My Brand",
  font: "DM Sans",
  displayFont: "Instrument Serif",
  hookColor: "#FFFFFF",
  hookPosition: "top",
  hookDurationMs: 5000,
  textColor: "#FFFFFF",
  outlineColor: "#000000",
  highlightColor: "#8656F6",
  highlightTextColor: "#FFFFFF",
  style: "pill",
  captionMode: "phrase",
  textEffect: "shadow",
  position: "bottom",
  wordsPerLine: 4,
  uppercase: false,
  fontSize: 64,
};

// Swatches offered in the color pickers (Sarabeth Holweg brand palette, read from a screenshot).
export const SWATCHES = ["#FFFFFF", "#F2EFFC", "#FBF4F0", "#8656F6", "#E85BDB", "#CEFC7E", "#1E1533", "#111015"];
