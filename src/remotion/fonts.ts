import { loadFont } from "@remotion/fonts";
import antonUrl from "@fontsource/anton/files/anton-latin-400-normal.woff2";
import archivoBlackUrl from "@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2";
import bebasNeueUrl from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2";
import caveatUrl from "@fontsource/caveat/files/caveat-latin-700-normal.woff2";
import dmSerifUrl from "@fontsource/dm-serif-display/files/dm-serif-display-latin-400-italic.woff2";
import interUrl from "@fontsource/inter/files/inter-latin-800-normal.woff2";
import montserratUrl from "@fontsource/montserrat/files/montserrat-latin-800-normal.woff2";
import pacificoUrl from "@fontsource/pacifico/files/pacifico-latin-400-normal.woff2";
import playfairUrl from "@fontsource/playfair-display/files/playfair-display-latin-800-italic.woff2";
import poppinsUrl from "@fontsource/poppins/files/poppins-latin-800-normal.woff2";
import type { FontName } from "../shared/fonts";

type FontFile = { url: string; weight: number; style: "normal" | "italic" };

// Font files ship with the app (no Google Fonts call at export time). Only the
// weight/style we draw with is included for each family.
const FILES: Record<FontName, FontFile> = {
  Montserrat: { url: montserratUrl, weight: 800, style: "normal" },
  Poppins: { url: poppinsUrl, weight: 800, style: "normal" },
  Anton: { url: antonUrl, weight: 400, style: "normal" },
  "Bebas Neue": { url: bebasNeueUrl, weight: 400, style: "normal" },
  "Archivo Black": { url: archivoBlackUrl, weight: 400, style: "normal" },
  Inter: { url: interUrl, weight: 800, style: "normal" },
  "DM Serif Display": { url: dmSerifUrl, weight: 400, style: "italic" },
  "Playfair Display": { url: playfairUrl, weight: 800, style: "italic" },
  Pacifico: { url: pacificoUrl, weight: 400, style: "normal" },
  Caveat: { url: caveatUrl, weight: 700, style: "normal" },
};

type Loaded = { fontFamily: string; fontWeight: number; fontStyle: "normal" | "italic" };

const requested = new Set<FontName>();

export function useBrandFont(name: string): Loaded {
  const key = (name in FILES ? name : "Montserrat") as FontName;
  const file = FILES[key];
  if (!requested.has(key)) {
    requested.add(key);
    void loadFont({ family: key, url: file.url, weight: String(file.weight), style: file.style });
  }
  return { fontFamily: `"${key}"`, fontWeight: file.weight, fontStyle: file.style };
}
