import type { ReelStyle } from "./types";

// Average color of a video (0-255), measured from a handful of frames.
export type ColorStats = { r: number; g: number; b: number; luma: number; white?: { r: number; g: number; b: number } };

export type GradePreset = ReelStyle["grade"];

export const GRADES: { value: GradePreset; label: string; note: string }[] = [
  { value: "off", label: "Original", note: "no color changes" },
  { value: "auto", label: "Auto-fix", note: "balance light and color" },
  { value: "bright", label: "Bright & clean", note: "airy, crisp, true color" },
  { value: "warm", label: "Warm", note: "golden, cozy skin tones" },
  { value: "soft", label: "Soft & matte", note: "lifted shadows, muted" },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// The color matrix (for an SVG feColorMatrix) that grades this video, or null for no change.
// Every look starts by correcting the video itself (exposure and color cast, measured from its
// frames), so the same look gives a consistent result whatever the lighting was that day.
export function gradeMatrix(preset: GradePreset | undefined, stats: ColorStats | undefined): string | null {
  if (!preset || preset === "off") return null;

  let gain = [1, 1, 1];
  let exposure = 1;
  if (stats && stats.luma > 4) {
    // White balance from the brightest areas (which should be neutral), applied gently so the
    // room's mood isn't erased.
    const ref = stats.white ?? { r: stats.r, g: stats.g, b: stats.b };
    const mean = (ref.r + ref.g + ref.b) / 3;
    gain = [ref.r, ref.g, ref.b].map((c) => clamp(1 + 0.6 * (mean / Math.max(c, 1) - 1), 0.88, 1.15));
    exposure = clamp(Math.pow(0.47 / (stats.luma / 255), 0.6), 0.9, 1.3);
  }

  const look = {
    auto: { exposure: 1, contrast: 1.03, saturation: 1.03, warm: 0, lift: 0 },
    bright: { exposure: 1.07, contrast: 1.06, saturation: 1.08, warm: -0.01, lift: 0 },
    warm: { exposure: 1.02, contrast: 1.04, saturation: 1.05, warm: 0.06, lift: 0 },
    soft: { exposure: 1.03, contrast: 0.9, saturation: 0.86, warm: 0.02, lift: 0.05 },
  }[preset];

  const warmGain = [1 + look.warm, 1 + look.warm * 0.3, 1 - look.warm * 1.3];
  const c = look.contrast;
  // Per channel: gain -> contrast around mid-grey -> lifted blacks.
  const k = [0, 1, 2].map((i) => gain[i] * warmGain[i] * exposure * look.exposure * c * (1 - look.lift));
  const o = (0.5 * (1 - c)) * (1 - look.lift) + look.lift;

  // Then saturation, keeping brightness the same.
  const s = look.saturation;
  const w = [0.2126, 0.7152, 0.0722];
  const rows = [0, 1, 2].map((row) =>
    [0, 1, 2].map((col) => (row === col ? s : 0) + (1 - s) * w[col]),
  );
  const values: number[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) values.push(rows[row][col] * k[col]);
    values.push(0, rows[row].reduce((sum, v) => sum + v * o, 0));
  }
  values.push(0, 0, 0, 1, 0);
  return values.map((v) => +v.toFixed(4)).join(" ");
}
