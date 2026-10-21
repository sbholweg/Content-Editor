import type { Word } from "./types";

export type CaptionPage = {
  words: Word[];
  startMs: number;
  endMs: number;
};

const PAUSE_BREAK_MS = 600;
const MAX_PAGE_GAP_MS = 1200;

// Groups words into short on-screen "pages" of a few words each. A page also breaks
// after sentence punctuation or a noticeable pause, so captions follow the speaker's rhythm.
export function buildPages(words: Word[], wordsPerLine: number): CaptionPage[] {
  const pages: CaptionPage[] = [];
  let current: Word[] = [];

  const flush = () => {
    if (current.length === 0) return;
    pages.push({ words: current, startMs: current[0].startMs, endMs: current[current.length - 1].endMs });
    current = [];
  };

  words.forEach((word, i) => {
    current.push(word);
    const next = words[i + 1];
    const endsSentence = /[.!?]$/.test(word.text.trim());
    const pauseAfter = next ? next.startMs - word.endMs : 0;
    if (current.length >= wordsPerLine || endsSentence || pauseAfter > PAUSE_BREAK_MS) flush();
  });
  flush();

  // Keep each page on screen until the next one starts (unless there's a long silence).
  for (let i = 0; i < pages.length - 1; i++) {
    const gap = pages[i + 1].startMs - pages[i].endMs;
    if (gap < MAX_PAGE_GAP_MS) pages[i].endMs = pages[i + 1].startMs;
  }
  return pages;
}
