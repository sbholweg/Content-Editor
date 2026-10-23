// Hooks can mark words for the accent style with stars: "nobody tells you this about *clients*".
// Those words show in the brand's accent font, in a block of its key color.

export type HookPart = { text: string; accent: boolean };

export function hookParts(text: string): HookPart[] {
  const parts: HookPart[] = [];
  text.split(/(\*[^*]+\*)/).forEach((piece) => {
    if (!piece) return;
    const accent = /^\*[^*]+\*$/.test(piece);
    parts.push({ text: accent ? piece.slice(1, -1) : piece, accent });
  });
  return parts;
}

// The hook without the star marks, for titles, file names and anywhere else it's shown as text.
export const plainHook = (text: string) => text.replace(/\*/g, "");
