import { loadFont } from "@remotion/fonts";
import antonUrl from "@fontsource/anton/files/anton-latin-400-normal.woff2";
import archivoBlackUrl from "@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2";
import bebasNeueUrl from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2";
import bodoniUrl from "@fontsource/bodoni-moda/files/bodoni-moda-latin-500-italic.woff2";
import caveatUrl from "@fontsource/caveat/files/caveat-latin-700-normal.woff2";
import courierUrl from "@fontsource/courier-prime/files/courier-prime-latin-700-normal.woff2";
import dmSansUrl from "@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2";
import dmSerifUrl from "@fontsource/dm-serif-display/files/dm-serif-display-latin-400-italic.woff2";
import frauncesUrl from "@fontsource/fraunces/files/fraunces-latin-400-italic.woff2";
import instrumentSerifUrl from "@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2";
import interUrl from "@fontsource/inter/files/inter-latin-700-normal.woff2";
import montserratUrl from "@fontsource/montserrat/files/montserrat-latin-800-normal.woff2";
import pacificoUrl from "@fontsource/pacifico/files/pacifico-latin-400-normal.woff2";
import playfairUrl from "@fontsource/playfair-display/files/playfair-display-latin-800-italic.woff2";
import poppinsUrl from "@fontsource/poppins/files/poppins-latin-800-normal.woff2";
import type { FontName } from "../shared/fonts";

type FontFile = { url: string; weight: number; style: "normal" | "italic" };

// Font files ship with the app (no Google Fonts call at export time). Only the
// weight/style we draw with is included for each family.
const FILES: Record<FontName, FontFile> = {
  "DM Sans": { url: dmSansUrl, weight: 600, style: "normal" },
  Inter: { url: interUrl, weight: 700, style: "normal" },
  Montserrat: { url: montserratUrl, weight: 800, style: "normal" },
  Poppins: { url: poppinsUrl, weight: 800, style: "normal" },
  "Courier Prime": { url: courierUrl, weight: 700, style: "normal" },
  Anton: { url: antonUrl, weight: 400, style: "normal" },
  "Bebas Neue": { url: bebasNeueUrl, weight: 400, style: "normal" },
  "Archivo Black": { url: archivoBlackUrl, weight: 400, style: "normal" },
  "Instrument Serif": { url: instrumentSerifUrl, weight: 400, style: "italic" },
  "Bodoni Moda": { url: bodoniUrl, weight: 500, style: "italic" },
  "DM Serif Display": { url: dmSerifUrl, weight: 400, style: "italic" },
  Fraunces: { url: frauncesUrl, weight: 400, style: "italic" },
  "Playfair Display": { url: playfairUrl, weight: 800, style: "italic" },
  Caveat: { url: caveatUrl, weight: 700, style: "normal" },
  Pacifico: { url: pacificoUrl, weight: 400, style: "normal" },
};

export type LoadedFont = { fontFamily: string; fontWeight: number; fontStyle: "normal" | "italic" };

const requested = new Set<FontName>();

// Registers the font with the page (and, during export, makes the render wait for it).
export function getFont(name: string): LoadedFont {
  const key = (name in FILES ? name : "DM Sans") as FontName;
  const file = FILES[key];
  if (!requested.has(key)) {
    requested.add(key);
    void loadFont({ family: key, url: file.url, weight: String(file.weight), style: file.style });
  }
  return { fontFamily: `"${key}"`, fontWeight: file.weight, fontStyle: file.style };
}
