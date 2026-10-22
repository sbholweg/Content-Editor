import { spawn } from "node:child_process";

export function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${cmd} failed (${code}): ${err.slice(-800)}`)),
    );
  });
}

export async function probe(file: string) {
  const out = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format=duration",
    "-of", "json",
    file,
  ]);
  const json = JSON.parse(out);
  // Still images report no duration ("N/A").
  const seconds = Number(json.format?.duration);
  return {
    width: Number(json.streams?.[0]?.width ?? 0),
    height: Number(json.streams?.[0]?.height ?? 0),
    durationMs: Number.isFinite(seconds) ? Math.round(seconds * 1000) : 0,
  };
}

// Phone videos are often HEVC .mov files with rotation metadata, which browsers and the
// renderer can't always read. Convert to a plain H.264 MP4 at 30fps, max 1080px wide.
export async function normalizeVideo(input: string, output: string) {
  await run("ffmpeg", [
    "-y", "-i", input,
    "-vf", "scale='min(1080,iw)':-2,fps=30",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-ac", "2",
    "-movflags", "+faststart",
    output,
  ]);
}

// B-roll for the library: same conversion as reels, but without sound.
export async function normalizeBroll(input: string, output: string) {
  await run("ffmpeg", [
    "-y", "-i", input,
    "-vf", "scale='min(1080,iw)':-2,fps=30",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
    "-an", "-movflags", "+faststart",
    output,
  ]);
}

export async function saveStill(input: string, output: string) {
  await run("ffmpeg", ["-y", "-ss", "0.5", "-i", input, "-frames:v", "1", "-vf", "scale=360:-2", output]);
}

// whisper.cpp needs 16kHz mono WAV.
export async function extractAudio(input: string, output: string) {
  await run("ffmpeg", ["-y", "-i", input, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", output]);
}

// Finds the quiet stretches (pauses) in a recording by measuring loudness every 20ms.
// The cutoff adapts to each video: phones turn up the background hiss when you stop talking,
// so a fixed "silence" level misses most real pauses. Instead we compare against this
// recording's own room noise and speaking level.
const FRAME_MS = 20;
const SAMPLE_RATE = 16000;

export async function detectSilences(input: string): Promise<{ startMs: number; endMs: number }[]> {
  const pcm = await new Promise<Buffer>((resolve, reject) => {
    const child = spawn("ffmpeg", ["-v", "error", "-i", input, "-vn", "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "-"]);
    const chunks: Buffer[] = [];
    child.stdout.on("data", (d: Buffer) => chunks.push(d));
    child.on("error", reject);
    child.on("close", () => resolve(Buffer.concat(chunks)));
  });
  return findPauses(loudness(pcm));
}

// Loudness of each 20ms frame, in dB (0 = as loud as possible).
export function loudness(pcm: Buffer): number[] {
  const perFrame = (SAMPLE_RATE * FRAME_MS) / 1000;
  const samples = Math.floor(pcm.length / 2);
  const out: number[] = [];
  for (let f = 0; f + perFrame <= samples; f += perFrame) {
    let sum = 0;
    for (let i = f; i < f + perFrame; i++) {
      const v = pcm.readInt16LE(i * 2) / 32768;
      sum += v * v;
    }
    out.push(10 * Math.log10(sum / perFrame + 1e-10));
  }
  return out;
}

export function findPauses(db: number[]): { startMs: number; endMs: number }[] {
  if (db.length < 10) return [];
  const sorted = [...db].sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const floor = pct(0.1);
  const speech = pct(0.9);
  // Too little difference between talking and not talking to tell them apart reliably.
  if (speech - floor < 10) return [];
  const cutoff = Math.max(floor + 0.4 * (speech - floor), speech - 26);

  const quiet = db.map((v) => v < cutoff);
  // A click or bump of up to 60ms inside a pause doesn't end the pause.
  for (let i = 0; i < quiet.length; i++) {
    if (quiet[i]) continue;
    let j = i;
    while (j < quiet.length && !quiet[j]) j++;
    if (i > 0 && j < quiet.length && j - i <= 3) for (let k = i; k < j; k++) quiet[k] = true;
    i = j;
  }

  const out: { startMs: number; endMs: number }[] = [];
  for (let i = 0; i < quiet.length; i++) {
    if (!quiet[i]) continue;
    let j = i;
    while (j < quiet.length && quiet[j]) j++;
    if ((j - i) * FRAME_MS >= 200) out.push({ startMs: i * FRAME_MS, endMs: j * FRAME_MS });
    i = j;
  }
  return out;
}
