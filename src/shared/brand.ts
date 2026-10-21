import type { BrandKit, ReelStyle } from "./types";

// Placeholder look until the real colors and fonts are chosen in the editor.
export const DEFAULT_STYLE: ReelStyle = {
  font: "DM Sans",
  displayFont: "Instrument Serif",
  hookColor: "#FFFFFF",
  hookPosition: "top",
  hookLayout: "headline",
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
  zoomJumps: false,
};

export const DEFAULT_BRAND: BrandKit = {
  name: "My Brand",
  business: { what: "", audience: "", cta: "" },
  defaultStyle: DEFAULT_STYLE,
  looks: [],
  ctaKeywords: [],
};

// Earlier versions stored these key word styles; map them onto the current ones.
const LEGACY_STYLES: Record<string, Pick<ReelStyle, "style" | "textEffect">> = {
  clean: { style: "serif", textEffect: "shadow" },
  pop: { style: "color", textEffect: "outline" },
  accent: { style: "serif", textEffect: "outline" },
};

export function normalizeStyle(saved: Partial<ReelStyle> & { style?: string } = {}): ReelStyle {
  const legacy = saved.style ? LEGACY_STYLES[saved.style] : undefined;
  const style = { ...DEFAULT_STYLE } as Record<string, unknown>;
  // Only copy known style fields, so older saved data with extra keys stays tidy.
  for (const key of Object.keys(DEFAULT_STYLE)) {
    if (key in saved) style[key] = (saved as Record<string, unknown>)[key];
  }
  return { ...(style as ReelStyle), ...legacy };
}

export function normalizeBrand(saved: Partial<BrandKit> & Partial<ReelStyle> = {}): BrandKit {
  return {
    name: saved.name ?? DEFAULT_BRAND.name,
    business: { ...DEFAULT_BRAND.business, ...saved.business },
    // Before saved looks existed, the style fields lived directly on the brand.
    defaultStyle: normalizeStyle(saved.defaultStyle ?? (saved as Partial<ReelStyle>)),
    looks: (saved.looks ?? []).map((l) => ({ ...l, style: normalizeStyle(l.style) })),
    ctaKeywords: saved.ctaKeywords ?? [],
  };
}

// Swatches offered in the color pickers (Sarabeth Holweg brand palette, read from a screenshot).
export const SWATCHES = ["#FFFFFF", "#F2EFFC", "#FBF4F0", "#8656F6", "#E85BDB", "#CEFC7E", "#1E1533", "#111015"];
