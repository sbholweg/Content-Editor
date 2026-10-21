import React, { useEffect, useRef, useState } from "react";
import type { Word } from "../shared/types";

const EMOJIS = ["🔥", "💰", "✨", "💡", "🚀", "❤️", "😂", "👀", "✅", "❌", "⏰", "📈", "🙌", "💸", "🎯"];

export function WordsPanel({
  words, timeMs, onChange, onSeek, onAuto,
}: {
  words: Word[];
  timeMs: number;
  onChange: (words: Word[]) => void;
  onSeek: (ms: number) => void;
  onAuto: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const activeRef = useRef<HTMLButtonElement>(null);
  const word = words.find((w) => w.id === selected);
  const update = (patch: Partial<Word>) => onChange(words.map((w) => (w.id === selected ? { ...w, ...patch } : w)));

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [Math.floor(timeMs / 500)]);

  if (words.length === 0) return <p className="muted pad">No speech was found in this video.</p>;

  return (
    <div className="stack">
      <div className="row">
        <p className="muted small grow">Tap a word to highlight it, fix a typo, or add an emoji.</p>
        <button
          className="small"
          disabled={autoBusy}
          onClick={async () => {
            setAutoBusy(true);
            await onAuto();
            setAutoBusy(false);
          }}
        >
          {autoBusy ? "Thinking…" : "✨ Auto-pick"}
        </button>
      </div>

      {word ? (
        <div className="card stack tight">
          <div className="row">
            <input className="grow" value={word.text} onChange={(e) => update({ text: e.target.value })} />
            <button className={word.highlight ? "primary" : ""} onClick={() => update({ highlight: !word.highlight })}>
              {word.highlight ? "★ Highlighted" : "☆ Highlight"}
            </button>
          </div>
          <div className="emojis">
            {EMOJIS.map((e) => (
              <button key={e} className={word.emoji === e ? "on" : ""} onClick={() => update({ emoji: word.emoji === e ? undefined : e })}>
                {e}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="ghost small" onClick={() => setSelected(null)}>Done</button>
            <span className="grow" />
            <button
              className="ghost small danger"
              onClick={() => {
                onChange(words.filter((w) => w.id !== selected));
                setSelected(null);
              }}
            >
              Remove word
            </button>
          </div>
        </div>
      ) : null}

      <div className="words">
        {words.map((w) => {
          const active = timeMs >= w.startMs && timeMs < w.endMs;
          return (
            <button
              key={w.id}
              ref={active ? activeRef : undefined}
              className={["word", w.highlight && "hl", active && "now", selected === w.id && "sel"].filter(Boolean).join(" ")}
              onClick={() => {
                setSelected(w.id);
                onSeek(w.startMs);
              }}
            >
              {w.emoji ? `${w.emoji} ` : ""}
              {w.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
