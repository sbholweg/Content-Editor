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
import outfitUrl from "@fontsource/outfit/files/outfit-latin-700-normal.woff2";
import lexendUrl from "@fontsource/lexend/files/lexend-latin-600-normal.woff2";
import bricolageGrotesqueUrl from "@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2";
import spaceGroteskUrl from "@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2";
import oswaldUrl from "@fontsource/oswald/files/oswald-latin-600-normal.woff2";
import leagueSpartanUrl from "@fontsource/league-spartan/files/league-spartan-latin-800-normal.woff2";
import ralewayUrl from "@fontsource/raleway/files/raleway-latin-800-normal.woff2";
import nunitoUrl from "@fontsource/nunito/files/nunito-latin-800-normal.woff2";
import rubikUrl from "@fontsource/rubik/files/rubik-latin-700-normal.woff2";
import syneUrl from "@fontsource/syne/files/syne-latin-700-normal.woff2";
import abrilFatfaceUrl from "@fontsource/abril-fatface/files/abril-fatface-latin-400-normal.woff2";
import cormorantGaramondUrl from "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-italic.woff2";
import libreBaskervilleUrl from "@fontsource/libre-baskerville/files/libre-baskerville-latin-400-italic.woff2";
import loraUrl from "@fontsource/lora/files/lora-latin-500-italic.woff2";
import youngSerifUrl from "@fontsource/young-serif/files/young-serif-latin-400-normal.woff2";
import gloockUrl from "@fontsource/gloock/files/gloock-latin-400-normal.woff2";
import shrikhandUrl from "@fontsource/shrikhand/files/shrikhand-latin-400-normal.woff2";
import dancingScriptUrl from "@fontsource/dancing-script/files/dancing-script-latin-700-normal.woff2";
import greatVibesUrl from "@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2";
import permanentMarkerUrl from "@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff2";
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
  "Outfit": { url: outfitUrl, weight: 700, style: "normal" },
  "Lexend": { url: lexendUrl, weight: 600, style: "normal" },
  "Bricolage Grotesque": { url: bricolageGrotesqueUrl, weight: 700, style: "normal" },
  "Space Grotesk": { url: spaceGroteskUrl, weight: 700, style: "normal" },
  "Oswald": { url: oswaldUrl, weight: 600, style: "normal" },
  "League Spartan": { url: leagueSpartanUrl, weight: 800, style: "normal" },
  "Raleway": { url: ralewayUrl, weight: 800, style: "normal" },
  "Nunito": { url: nunitoUrl, weight: 800, style: "normal" },
  "Rubik": { url: rubikUrl, weight: 700, style: "normal" },
  "Syne": { url: syneUrl, weight: 700, style: "normal" },
  "Abril Fatface": { url: abrilFatfaceUrl, weight: 400, style: "normal" },
  "Cormorant Garamond": { url: cormorantGaramondUrl, weight: 600, style: "italic" },
  "Libre Baskerville": { url: libreBaskervilleUrl, weight: 400, style: "italic" },
  "Lora": { url: loraUrl, weight: 500, style: "italic" },
  "Young Serif": { url: youngSerifUrl, weight: 400, style: "normal" },
  "Gloock": { url: gloockUrl, weight: 400, style: "normal" },
  "Shrikhand": { url: shrikhandUrl, weight: 400, style: "normal" },
  "Dancing Script": { url: dancingScriptUrl, weight: 700, style: "normal" },
  "Great Vibes": { url: greatVibesUrl, weight: 400, style: "normal" },
  "Permanent Marker": { url: permanentMarkerUrl, weight: 400, style: "normal" },
};

export type LoadedFont = { fontFamily: string; fontWeight: number; fontStyle: "normal" | "italic" };

const requested = new Set<string>();
const custom = new Map<string, string>();

// Fonts the creator uploaded. They're drawn at their natural weight and style.
export function registerCustomFonts(fonts: { name: string; url: string }[]) {
  for (const f of fonts) custom.set(f.name, f.url);
}

// The file type comes from the extension; media links carry a "?t=..." token after it.
function fontFormat(url: string) {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return ext === "woff2" ? "woff2" : ext === "woff" ? "woff" : ext === "otf" ? "opentype" : "truetype";
}

// Registers the font with the page (and, during export, makes the render wait for it).
export function getFont(name: string): LoadedFont {
  const customUrl = custom.get(name);
  if (customUrl) {
    if (!requested.has(name)) {
      requested.add(name);
      void loadFont({ family: name, url: customUrl, format: fontFormat(customUrl) });
    }
    return { fontFamily: `"${name}"`, fontWeight: 400, fontStyle: "normal" };
  }
  const key = (name in FILES ? name : "DM Sans") as FontName;
  const file = FILES[key];
  if (!requested.has(key)) {
    requested.add(key);
    void loadFont({ family: key, url: file.url, weight: String(file.weight), style: file.style });
  }
  return { fontFamily: `"${key}"`, fontWeight: file.weight, fontStyle: file.style };
}
