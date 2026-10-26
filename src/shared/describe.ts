import { BUILTIN_SOUNDS } from "./sounds.ts";
import { buildTimeline } from "./timeline.ts";
import type { Asset, Project } from "./types.ts";

const fmt = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

// A reel in plain text for Claude: hook, look, every word numbered, media, sounds and notes.
export function describeReel(p: Project, assets: Asset[], editorLink = "") {
  const timeline = buildTimeline(p.words, p.durationMs, p.removePauses, p.silences, p.style.speed);
  const s = p.style;
  const lines = [
    `Reel ${p.id}${p.variantLabel ? ` (trial reel: ${p.variantLabel})` : ""}`,
    ...(editorLink ? [`  Open in the editor: ${editorLink}`] : []),
    `  From: ${p.originalName} · status ${p.status} · ${fmt(timeline.durationMs)} after cuts (${fmt(p.durationMs)} raw) · pauses ${p.removePauses ? "removed" : "kept"} · export ${p.render.status}`,
    `  Hook: ${p.hookText ? `"${p.hookText}"` : "(none)"}${p.hookSubText ? ` + "${p.hookSubText}"` : ""} · ${s.hookLayout} · ${s.displayFont} ${s.hookColor} at ${s.hookPosition}, ${s.hookDurationMs ? `${s.hookDurationMs / 1000}s` : "whole video"}`,
    `  Captions: ${s.captionsOn === false ? "OFF" : s.captionMode === "single" ? "one word at a time" : `${s.captionMode === "karaoke" ? "karaoke" : "phrase"}, ${s.wordsPerLine} words`} · ${s.font} ${s.fontSize}px ${s.textColor} · ${s.textEffect} · at ${s.position}${s.uppercase ? " · ALL CAPS" : ""}${s.zoomJumps ? " · zoom jumps" : ""}${s.logo && s.logo !== "off" ? ` · logo ${s.logo}` : ""}`,
    `  Key words: ${s.style === "pill" ? `bubble ${s.highlightColor} with ${s.highlightTextColor} text` : s.style === "color" ? `coloured text ${s.highlightColor}` : `serif word ${s.highlightColor}`}`,
    "",
    "  Words ([n] = word number, *word* = key word, ~word~ = cut):",
  ];
  let line = "  ";
  p.words.forEach((w, i) => {
    let t = w.text;
    if (w.highlight) t = `*${t}*`;
    if (w.cut) t = `~${t}~`;
    const piece = `[${i}]${w.emoji ? w.emoji : ""}${t} `;
    if (line.length + piece.length > 100) {
      lines.push(line.trimEnd());
      line = "  ";
    }
    line += piece;
  });
  if (line.trim()) lines.push(line.trimEnd());
  const index = new Map(p.words.map((w, i) => [w.id, i]));
  if (p.overlays.length) {
    lines.push("", "  Media:");
    for (const o of p.overlays) {
      const a = assets.find((x) => x.id === o.assetId);
      const what = o.graphic
        ? `${o.graphic.kind} "${o.graphic.text}"${o.graphic.sub ? ` / "${o.graphic.sub}"` : ""}`
        : a ? `${a.name} (${a.kind})` : o.gifQuery ? `GIPHY GIF "${o.gifQuery}" (they pick it in the editor)` : "missing";
      lines.push(`  - ${o.id}: ${what}${o.suggested ? " · SUGGESTED, not yet kept" : ""} · ${o.x !== undefined ? `at ${o.x}%/${o.y}%` : o.placement} · words [${index.get(o.startWordId)}]-[${index.get(o.endWordId)}]`);
    }
  }
  if (p.music || p.sounds.length) {
    const soundName = (id: string) => BUILTIN_SOUNDS.find((b) => b.id === id)?.name ?? assets.find((a) => a.id === id)?.name ?? "missing";
    lines.push("", `  Sound${p.soundsEnabled ? "" : " (effects switched off)"}:`);
    if (p.music) lines.push(`  - music: ${soundName(p.music.soundId)} · volume ${p.music.volume}${p.music.duck ? " · quieter while talking" : ""}${p.music.enabled ? "" : " · off"}`);
    for (const c of p.sounds) lines.push(`  - ${c.id}: ${soundName(c.soundId)} on word [${index.get(c.wordId)}]`);
  }
  if (p.notes?.length) {
    lines.push("", "  Notes on the draft (the creator's requests; apply them, then send \"clearNotes\": true):");
    for (const n of p.notes) {
      // The word playing at that moment of the finished reel.
      const at = timeline.words.find((w) => n.atMs < w.endMs) ?? timeline.words.at(-1);
      lines.push(`  - at ${fmt(n.atMs)}${at ? ` (around word [${index.get(at.id)}] "${at.text}")` : ""}: ${n.text}`);
    }
  }
  lines.push("", `  Post caption: ${p.postCaption ? `\n    ${p.postCaption.replace(/\n/g, "\n    ")}` : "(none yet)"}`);
  return lines.join("\n");
}
