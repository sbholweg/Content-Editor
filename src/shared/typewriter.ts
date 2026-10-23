// Typewriter timing: when each character of a line appears, so the text on screen and the key
// clicks under it stay in sync. Short lines type at a natural pace; long ones speed up so typing
// always finishes within the first part of the time the hook is on screen.
export function typeTimes(text: string, startMs: number, onScreenMs: number) {
  const chars = [...text];
  const cps = Math.max(16, chars.length / Math.max(0.6, (onScreenMs * 0.55) / 1000));
  const step = 1000 / cps;
  return chars.map((c, i) => ({ char: c, atMs: startMs + i * step, click: c.trim() !== "" }));
}

// Which line of the hook types on: the small second line if there is one (the headline pops in
// first, like an editorial title with a typed subline), otherwise the headline itself.
export function typedLine(hookText: string, subText: string) {
  return subText.trim() ? { line: "sub" as const, text: subText, startMs: 350 } : { line: "main" as const, text: hookText, startMs: 150 };
}
