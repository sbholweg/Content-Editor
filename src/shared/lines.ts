import type { Word } from "./types";

export type Line = { id: string; number: number; words: Word[] };

const MAX_WORDS = 14;
const PAUSE_MS = 700;

// Splits the transcript into short lines (roughly sentences) for the editor, breaking at
// sentence endings, noticeable pauses, or when a line gets long.
export function buildLines(words: Word[]): Line[] {
  const lines: Line[] = [];
  let current: Word[] = [];
  const flush = () => {
    if (current.length) lines.push({ id: current[0].id, number: lines.length + 1, words: current });
    current = [];
  };
  words.forEach((w, i) => {
    current.push(w);
    const next = words[i + 1];
    if (/[.!?]$/.test(w.text.trim()) || (next && next.startMs - w.endMs > PAUSE_MS) || current.length >= MAX_WORDS) flush();
  });
  flush();
  return lines;
}

export const lineText = (line: Line) => line.words.map((w) => w.text).join(" ");
export const isLineCut = (line: Line) => line.words.every((w) => w.cut);
