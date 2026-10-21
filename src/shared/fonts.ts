// Fonts available in the editor. Each must have a matching file in src/remotion/fonts.ts.

// Clean, readable fonts for the word-by-word subtitles.
export const SUBTITLE_FONTS = [
  { name: "DM Sans", note: "soft" },
  { name: "Inter", note: "clean" },
  { name: "Montserrat", note: "rounder" },
  { name: "Poppins", note: "friendly" },
  { name: "Courier Prime", note: "typewriter" },
  { name: "Anton", note: "tall & loud" },
  { name: "Bebas Neue", note: "all caps" },
  { name: "Archivo Black", note: "heavy" },
  { name: "Outfit", note: "modern" },
  { name: "Lexend", note: "easy to read" },
  { name: "Bricolage Grotesque", note: "quirky" },
  { name: "Space Grotesk", note: "techy" },
  { name: "Oswald", note: "condensed" },
  { name: "League Spartan", note: "geometric" },
  { name: "Raleway", note: "elegant" },
  { name: "Nunito", note: "rounded" },
  { name: "Rubik", note: "soft corners" },
  { name: "Syne", note: "artsy" },
] as const;

// Statement fonts for the hook title and accent words.
export const DISPLAY_FONTS = [
  { name: "Instrument Serif", note: "trendy, narrow" },
  { name: "Bodoni Moda", note: "Vogue magazine" },
  { name: "DM Serif Display", note: "bold" },
  { name: "Fraunces", note: "soft" },
  { name: "Playfair Display", note: "classic" },
  { name: "Caveat", note: "handwritten" },
  { name: "Pacifico", note: "playful script" },
  { name: "Abril Fatface", note: "fashion" },
  { name: "Cormorant Garamond", note: "luxury" },
  { name: "Libre Baskerville", note: "bookish" },
  { name: "Lora", note: "warm" },
  { name: "Young Serif", note: "vintage" },
  { name: "Gloock", note: "editorial" },
  { name: "Shrikhand", note: "retro" },
  { name: "Dancing Script", note: "script" },
  { name: "Great Vibes", note: "calligraphy" },
  { name: "Permanent Marker", note: "marker" },
] as const;

export type FontName = (typeof SUBTITLE_FONTS)[number]["name"] | (typeof DISPLAY_FONTS)[number]["name"];
