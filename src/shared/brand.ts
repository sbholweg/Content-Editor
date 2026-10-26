import type { BrandKit, Project, Recipe, ReelStyle } from "./types";

// Placeholder look until the real colors and fonts are chosen in the editor.
export const DEFAULT_STYLE: ReelStyle = {
  font: "DM Sans",
  displayFont: "Instrument Serif",
  hookColor: "#FFFFFF",
  hookPosition: "top",
  hookPlace: null,
  hookLayout: "headline",
  hookAnimation: "pop",
  hookAccent: "block",
  // Empty = use the key word colors.
  accentColor: "",
  accentTextColor: "",
  accentFont: "Instrument Serif",
  captionAnimation: "pop",
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
  zoomStyle: "lines",
  speed: 1,
  grade: "off",
  cleanAudio: false,
  captionAlign: "center",
  captionsOn: true,
  logo: "off",
};

export const DEFAULT_BRAND: BrandKit = {
  name: "My Brand",
  tagline: "",
  setUp: false,
  palette: [],
  fonts: { headline: DEFAULT_STYLE.displayFont, body: DEFAULT_STYLE.font, accent: "Caveat" },
  logoAssetId: "",
  voice: { tone: [], phrases: [], avoid: [] },
  inspiration: [],
  story: "",
  business: { what: "", audience: "", cta: "" },
  defaultStyle: DEFAULT_STYLE,
  looks: [],
  recipes: [],
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
    tagline: saved.tagline ?? "",
    setUp: saved.setUp ?? false,
    palette: saved.palette ?? [],
    fonts: { ...DEFAULT_BRAND.fonts, ...saved.fonts },
    logoAssetId: saved.logoAssetId ?? "",
    voice: { ...DEFAULT_BRAND.voice, ...saved.voice },
    inspiration: saved.inspiration ?? [],
    story: saved.story ?? "",
    business: { ...DEFAULT_BRAND.business, ...saved.business },
    // Before saved looks existed, the style fields lived directly on the brand.
    defaultStyle: normalizeStyle(saved.defaultStyle ?? (saved as Partial<ReelStyle>)),
    looks: (saved.looks ?? []).map((l) => ({ ...l, style: normalizeStyle(l.style) })),
    recipes: (saved.recipes ?? []).map((r) => ({ ...r, style: normalizeStyle(r.style), autoSounds: Boolean(r.autoSounds), suggestGraphics: Boolean(r.suggestGraphics), endCard: r.endCard ?? null })),
    ctaKeywords: saved.ctaKeywords ?? [],
  };
}

// Swatches offered in the color pickers until a brand palette is set.
export const SWATCHES = ["#FFFFFF", "#F2EFFC", "#FBF4F0", "#8656F6", "#E85BDB", "#CEFC7E", "#1E1533", "#111015"];

// The brand's colors first, then white and black, which captions almost always need.
export function swatchesFor(brand: Pick<BrandKit, "palette"> | null | undefined) {
  if (!brand?.palette.length) return SWATCHES;
  const hexes = brand.palette.map((c) => c.hex.toUpperCase());
  return [...new Set([...hexes, "#FFFFFF", "#000000"])];
}

// Points new reels at the brand: its fonts and main color become the default look.
export function styleFromBrand(brand: BrandKit, base: ReelStyle): ReelStyle {
  const primary = brand.palette.find((c) => c.role === "primary")?.hex ?? base.highlightColor;
  return { ...base, font: brand.fonts.body, displayFont: brand.fonts.headline, accentFont: brand.fonts.accent || base.accentFont, highlightColor: primary };
}

// The brand colors slides are drawn with (falls back to the reel's colors).
export function slideColors(brand: Pick<BrandKit, "palette">, style: ReelStyle) {
  const role = (r: string) => brand.palette.find((c) => c.role === r)?.hex;
  return {
    background: role("background") ?? "#FAFAF9",
    text: role("text") ?? "#16121F",
    primary: role("primary") ?? style.highlightColor,
  };
}

// Puts a recipe on a reel: its look (keeping where this reel's hook was dragged), its end card, and
// sound effects by moment if the recipe adds them. Suggesting graphics needs Claude, so the server
// runs that part separately.
export function recipeChanges(project: Project, recipe: Recipe, autoSoundsFn: (p: Project) => Project["sounds"]): Partial<Project> {
  const changes: Partial<Project> = { style: { ...recipe.style, hookPlace: project.style.hookPlace } };
  if (recipe.endCard) changes.endCard = recipe.endCard;
  if (recipe.autoSounds) changes.sounds = autoSoundsFn({ ...project, ...changes } as Project);
  if (recipe.autoSounds) changes.soundsEnabled = true;
  return changes;
}
