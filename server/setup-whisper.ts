import fs from "node:fs/promises";
import path from "node:path";
import { downloadWhisperModel, installWhisperCpp } from "@remotion/install-whisper-cpp";
import { config } from "./config.ts";

// Builds whisper.cpp and downloads the speech model. Safe to run repeatedly.
export async function setupWhisper() {
  await installWhisperCpp({ to: config.whisperDir, version: config.whisperVersion, printOutput: true });
  // A download interrupted on a previous boot leaves an empty file that blocks retrying.
  const modelPath = path.join(config.whisperDir, `ggml-${config.whisperModel}.bin`);
  const stat = await fs.stat(modelPath).catch(() => null);
  if (stat && stat.size === 0) await fs.rm(modelPath);
  await downloadWhisperModel({ model: config.whisperModel, folder: config.whisperDir, printOutput: true });
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
