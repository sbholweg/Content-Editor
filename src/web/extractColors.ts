import type { BrandColor } from "../shared/types";

type RGB = [number, number, number];

const hex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const lightness = ([r, g, b]: RGB) => (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
const saturation = ([r, g, b]: RGB) => {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
};
const dist = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

async function pixels(url: string): Promise<RGB[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, 48, 48);
  const data = ctx.getImageData(0, 0, 48, 48).data;
  const out: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) out.push([data[i], data[i + 1], data[i + 2]]);
  return out;
}

// Finds the main colors across an inspiration board (k-means), then assigns brand roles:
// the lightest calm color as background, the darkest as text, and the most vivid as the signature.
export async function paletteFromImages(urls: string[]): Promise<BrandColor[]> {
  const all = (await Promise.all(urls.map((u) => pixels(u).catch(() => [] as RGB[])))).flat();
  if (all.length < 50) return [];
  let centers: RGB[] = Array.from({ length: 8 }, (_, i) => all[Math.floor((i / 8) * all.length)]);
  let counts: number[] = [];
  for (let iter = 0; iter < 10; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const p of all) {
      let best = 0;
      for (let c = 1; c < centers.length; c++) if (dist(p, centers[c]) < dist(p, centers[best])) best = c;
      sums[best][0] += p[0];
      sums[best][1] += p[1];
      sums[best][2] += p[2];
      sums[best][3]++;
    }
    counts = sums.map((s) => s[3]);
    centers = sums.map((s, i) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[i]) as RGB);
  }
  const ranked = centers.map((c, i) => ({ c, n: counts[i] })).filter((x) => x.n > all.length * 0.01);
  const take = (pick: (x: { c: RGB; n: number }) => number, exclude: RGB[]) => {
    const pool = ranked.filter((x) => exclude.every((e) => dist(e, x.c) > 1800));
    return pool.sort((a, b) => pick(b) - pick(a))[0]?.c;
  };
  const used: RGB[] = [];
  const add = (c: RGB | undefined) => (c && used.push(c), c);
  const background = add(take((x) => lightness(x.c) * 2 - saturation(x.c), used));
  const text = add(take((x) => -lightness(x.c), used));
  const primary = add(take((x) => saturation(x.c) * 2 + Math.min(x.n / all.length, 0.2) - Math.abs(lightness(x.c) - 0.5), used));
  const accent = add(take((x) => saturation(x.c) - Math.abs(lightness(x.c) - 0.6), used));
  const extra = add(take((x) => x.n, used));
  return [
    primary && { hex: hex(primary), name: "Signature", role: "primary" as const },
    accent && { hex: hex(accent), name: "Accent", role: "accent" as const },
    background && { hex: hex(background), name: "Background", role: "background" as const },
    text && { hex: hex(text), name: "Ink", role: "text" as const },
    extra && { hex: hex(extra), name: "Extra", role: "extra" as const },
  ].filter(Boolean) as BrandColor[];
}
