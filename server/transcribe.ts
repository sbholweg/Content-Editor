import { toCaptions, transcribe } from "@remotion/install-whisper-cpp";
import type { Word } from "../src/shared/types.ts";
import { config } from "./config.ts";
import { ensureWhisper } from "./setup-whisper.ts";

// Runs whisper.cpp locally (free, no API key) and returns one entry per spoken word.
export async function transcribeWords(wavPath: string): Promise<Word[]> {
  await ensureWhisper();
  const output = await transcribe({
    inputPath: wavPath,
    whisperPath: config.whisperDir,
    whisperCppVersion: config.whisperVersion,
    model: config.whisperModel,
    tokenLevelTimestamps: true,
    // Whisper tends to skip filler words; an example prompt containing them nudges it to keep
    // "um"/"uh" in the transcript so they can be cut.
    additionalArgs: [["--prompt", "Um, so, uh, I was like, hmm, you know, I mean, um."]],
  });
  const { captions } = toCaptions({ whisperCppOutput: output });

  // Whisper returns sub-word tokens; a token starting with a space begins a new word.
  const words: Word[] = [];
  for (const c of captions) {
    const text = c.text;
    if (!text.trim() || /^\[.*\]$/.test(text.trim())) continue;
    const prev = words[words.length - 1];
    if (prev && !text.startsWith(" ")) {
      prev.text += text;
      prev.endMs = Math.max(prev.endMs, c.endMs);
    } else {
      words.push({ id: `w${words.length}`, text: text.trim(), startMs: c.startMs, endMs: c.endMs, highlight: false });
    }
  }
  return words;
}
