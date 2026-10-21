// Fonts available in the editor. Each must have a matching loader in src/remotion/fonts.ts.
export const FONT_OPTIONS = [
  "Montserrat",
  "Poppins",
  "Anton",
  "Bebas Neue",
  "Archivo Black",
  "Inter",
  "DM Serif Display",
  "Playfair Display",
  "Pacifico",
  "Caveat",
] as const;

export type FontName = (typeof FONT_OPTIONS)[number];
