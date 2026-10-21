// Fonts available in the editor. Each must have a matching file in src/remotion/fonts.ts.
// Any font can be used for captions or the hook; they're grouped to make picking easier.

export const FONT_GROUPS = [
  {
    label: "Clean",
    fonts: [
      { name: "DM Sans", note: "soft" },
      { name: "Inter", note: "clean" },
      { name: "Montserrat", note: "rounder" },
      { name: "Poppins", note: "friendly" },
      { name: "Outfit", note: "modern" },
      { name: "Lexend", note: "easy to read" },
      { name: "Raleway", note: "elegant" },
      { name: "Nunito", note: "rounded" },
      { name: "Rubik", note: "soft corners" },
      { name: "League Spartan", note: "geometric" },
      { name: "Space Grotesk", note: "techy" },
      { name: "Bricolage Grotesque", note: "quirky" },
      { name: "Syne", note: "artsy" },
      { name: "Oswald", note: "condensed" },
      { name: "Anton", note: "tall & loud" },
      { name: "Bebas Neue", note: "all caps" },
      { name: "Archivo Black", note: "heavy" },
    ],
  },
  {
    label: "Serif",
    fonts: [
      { name: "Instrument Serif (upright)", note: "editorial" },
      { name: "Instrument Serif", note: "editorial, italic" },
      { name: "Playfair Display (upright)", note: "classic" },
      { name: "Playfair Display", note: "classic, italic" },
      { name: "Bodoni Moda (upright)", note: "Vogue magazine" },
      { name: "Bodoni Moda", note: "Vogue, italic" },
      { name: "DM Serif Display (upright)", note: "bold" },
      { name: "DM Serif Display", note: "bold, italic" },
      { name: "Libre Baskerville (upright)", note: "bookish" },
      { name: "Libre Baskerville", note: "bookish, italic" },
      { name: "Lora (upright)", note: "warm" },
      { name: "Lora", note: "warm, italic" },
      { name: "Cormorant Garamond (upright)", note: "luxury" },
      { name: "Cormorant Garamond", note: "luxury, italic" },
      { name: "Fraunces", note: "soft, italic" },
      { name: "Abril Fatface", note: "fashion" },
      { name: "Young Serif", note: "vintage" },
      { name: "Gloock", note: "high contrast" },
    ],
  },
  {
    label: "Script & fun",
    fonts: [
      { name: "Caveat", note: "handwritten" },
      { name: "Dancing Script", note: "script" },
      { name: "Great Vibes", note: "calligraphy" },
      { name: "Pacifico", note: "playful script" },
      { name: "Permanent Marker", note: "marker" },
      { name: "Shrikhand", note: "retro" },
      { name: "Courier Prime", note: "typewriter" },
    ],
  },
] as const;

export type FontName = (typeof FONT_GROUPS)[number]["fonts"][number]["name"];
