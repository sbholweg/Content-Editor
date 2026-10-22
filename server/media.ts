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

// Finds quiet stretches in the audio (where the speaker isn't talking). The threshold is set a
// little below normal speech so breaths and room noise count as quiet.
export async function detectSilences(input: string): Promise<{ startMs: number; endMs: number }[]> {
  const log = await new Promise<string>((resolve, reject) => {
    const child = spawn("ffmpeg", ["-i", input, "-af", "silencedetect=noise=-34dB:d=0.2", "-f", "null", "-"]);
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", () => resolve(err));
  });
  const out: { startMs: number; endMs: number }[] = [];
  let start: number | null = null;
  for (const line of log.split("\n")) {
    const s = line.match(/silence_start: ([\d.]+)/);
    const e = line.match(/silence_end: ([\d.]+)/);
    if (s) start = Number(s[1]) * 1000;
    if (e && start !== null) {
      out.push({ startMs: Math.round(start), endMs: Math.round(Number(e[1]) * 1000) });
      start = null;
    }
  }
  return out;
}
