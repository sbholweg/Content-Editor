import type { BrandColor, BrandKit } from "./types";

// Builds a starting brand from a few answers, with no AI needed. Claude can refine it after.

export const VIBES = [
  { id: "calm", label: "Calm & soft", fonts: { headline: "Fraunces", body: "DM Sans", accent: "Caveat" } },
  { id: "editorial", label: "Editorial", fonts: { headline: "Instrument Serif (upright)", body: "Inter", accent: "Caveat" } },
  { id: "luxe", label: "Luxe", fonts: { headline: "Cormorant Garamond (upright)", body: "Raleway", accent: "Great Vibes" } },
  { id: "warm", label: "Warm & friendly", fonts: { headline: "Young Serif", body: "Nunito", accent: "Dancing Script" } },
  { id: "playful", label: "Playful", fonts: { headline: "Shrikhand", body: "Poppins", accent: "Pacifico" } },
  { id: "bold", label: "Bold", fonts: { headline: "Anton", body: "Montserrat", accent: "Permanent Marker" } },
  { id: "modern", label: "Modern & techy", fonts: { headline: "Space Grotesk", body: "Outfit", accent: "Caveat" } },
] as const;

export type BrandAnswers = { name: string; what: string; audience: string; vibes: string[]; color: string };

function toHsl(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function toHex(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// A cohesive palette from one favorite color: the color itself, a companion accent, a very
// light background, a deep text color and a soft tint.
export function paletteFrom(hex: string): BrandColor[] {
  const { h, s } = toHsl(hex);
  const sat = Math.max(s, 0.35);
  return [
    { hex: hex.toUpperCase(), name: "Signature", role: "primary" },
    { hex: toHex((h + 40) % 360, Math.min(sat, 0.75), 0.62), name: "Accent", role: "accent" },
    { hex: toHex(h, Math.min(sat, 0.6), 0.96), name: "Background", role: "background" },
    { hex: toHex(h, Math.min(sat, 0.45), 0.13), name: "Ink", role: "text" },
    { hex: toHex(h, Math.min(sat, 0.7), 0.86), name: "Soft tint", role: "extra" },
  ];
}

export function buildBrand(answers: BrandAnswers, current: BrandKit): BrandKit {
  const vibe = VIBES.find((v) => v.id === answers.vibes[0]) ?? VIBES[0];
  return {
    ...current,
    name: answers.name.trim() || current.name,
    setUp: true,
    palette: paletteFrom(answers.color),
    fonts: { ...vibe.fonts },
    voice: { ...current.voice, tone: answers.vibes.map((id) => VIBES.find((v) => v.id === id)?.label.toLowerCase() ?? id) },
    business: { ...current.business, what: answers.what || current.business.what, audience: answers.audience || current.business.audience },
  };
}

// Pulls hex codes out of pasted text like "#8656F6, e85bdb / #CEFC7E".
export function parseHexes(text: string) {
  return [...text.matchAll(/#?\b([0-9a-fA-F]{6})\b/g)].map((m) => `#${m[1].toUpperCase()}`);
}
