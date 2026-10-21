import fs from "node:fs/promises";
import path from "node:path";
import { downloadWhisperModel, installWhisperCpp } from "@remotion/install-whisper-cpp";
import { config } from "./config.ts";

// Builds whisper.cpp and downloads the speech model. Safe to run repeatedly.
export async function setupWhisper() {
  await installWhisperCpp({ to: config.whisperDir, version: config.whisperVersion, printOutput: true });
  if (process.platform === "win32") await placeWindowsBinaries();
  // A download interrupted on a previous boot leaves an empty file that blocks retrying.
  const modelPath = path.join(config.whisperDir, `ggml-${config.whisperModel}.bin`);
  const stat = await fs.stat(modelPath).catch(() => null);
  if (stat && stat.size === 0) await fs.rm(modelPath);
  await downloadWhisperModel({ model: config.whisperModel, folder: config.whisperDir, printOutput: true });
}

// On Windows a prebuilt download is unpacked instead of building from source. If the zip's
// folder layout doesn't match where the transcriber looks (build/bin), copy the files there.
async function placeWindowsBinaries() {
  const expected = path.join(config.whisperDir, "build", "bin", "whisper-cli.exe");
  if (await fs.stat(expected).catch(() => null)) return;
  const found = await findFile(config.whisperDir, "whisper-cli.exe");
  if (!found) throw new Error(`whisper-cli.exe wasn't found in ${config.whisperDir}. Delete that folder and try again.`);
  const from = path.dirname(found);
  await fs.mkdir(path.dirname(expected), { recursive: true });
  for (const name of await fs.readdir(from)) {
    await fs.copyFile(path.join(from, name), path.join(path.dirname(expected), name)).catch(() => {});
  }
}

async function findFile(dir: string, name: string): Promise<string | null> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === name) return full;
    if (entry.isDirectory()) {
      const inner = await findFile(full, name);
      if (inner) return inner;
    }
  }
  return null;
}

let ready: Promise<void> | null = null;

// Shared by server boot and transcription, so a job waits for setup instead of failing.
export function ensureWhisper() {
  ready ??= setupWhisper().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}
