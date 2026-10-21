import { spawn } from "node:child_process";

function run(cmd: string, args: string[]): Promise<string> {
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
  return {
    width: Number(json.streams?.[0]?.width ?? 0),
    height: Number(json.streams?.[0]?.height ?? 0),
    durationMs: Math.round(Number(json.format?.duration ?? 0) * 1000),
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

// whisper.cpp needs 16kHz mono WAV.
export async function extractAudio(input: string, output: string) {
  await run("ffmpeg", ["-y", "-i", input, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", output]);
}
