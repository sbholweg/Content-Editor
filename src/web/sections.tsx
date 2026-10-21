import React, { useState } from "react";
import { DISPLAY_FONTS, SUBTITLE_FONTS } from "../shared/fonts";
import type { BrandKit, Word } from "../shared/types";
import { Card, FontOptions, Label, Options, Slider, Swatches } from "./ui";

type BrandProps = { brand: BrandKit; onBrand: (b: BrandKit) => void };
const setter = ({ brand, onBrand }: BrandProps) => <K extends keyof BrandKit>(key: K, value: BrandKit[K]) => onBrand({ ...brand, [key]: value });

export function HookCard({ hookText, onHookText, ...props }: BrandProps & { hookText: string; onHookText: (t: string) => void }) {
  const set = setter(props);
  return (
    <Card title="Hook">
      <Label>Title at the top of the reel</Label>
      <textarea
        className="hook-input serif"
        rows={2}
        value={hookText}
        placeholder="nobody's saying it, so I will"
        onChange={(e) => onHookText(e.target.value)}
      />
      <Label>Hook font</Label>
      <FontOptions value={props.brand.displayFont} fonts={DISPLAY_FONTS} onChange={(v) => set("displayFont", v)} />
      <Label>Hook colour</Label>
      <Swatches value={props.brand.hookColor} onChange={(v) => set("hookColor", v)} />
      <Label>Stays on screen</Label>
      <Options
        value={props.brand.hookDurationMs}
        onChange={(v) => set("hookDurationMs", v)}
        options={[
          { value: 3000, label: "3 seconds" },
          { value: 5000, label: "5 seconds" },
          { value: 0, label: "Whole video" },
        ]}
      />
    </Card>
  );
}

export function SubtitlesCard(props: BrandProps) {
  const { brand } = props;
  const set = setter(props);
  return (
    <Card title="Subtitles">
      <Label>Subtitle font</Label>
      <FontOptions value={brand.font} fonts={SUBTITLE_FONTS} onChange={(v) => set("font", v)} />
      <Label>Key word style</Label>
      <Options
        value={brand.style}
        onChange={(v) => set("style", v)}
        options={[
          { value: "clean", label: "Clean", note: "serif key words" },
          { value: "pill", label: "Pill", note: "colour block" },
          { value: "pop", label: "Colour pop", note: "bold & bouncy" },
          { value: "accent", label: "Accent", note: "outlined + serif" },
        ]}
      />
      <Label>Subtitle position</Label>
      <Options
        value={brand.position}
        onChange={(v) => set("position", v)}
        options={[
          { value: "top", label: "Top", note: "under the hook" },
          { value: "middle", label: "Middle", note: "centre of the frame" },
          { value: "bottom", label: "Lower", note: "just above the Reels bar" },
        ]}
      />
      <div className="two">
        <Slider label="Subtitle size" value={brand.fontSize} min={44} max={110} onChange={(v) => set("fontSize", v)} />
        <Slider label={`Words at once · ${brand.wordsPerLine}`} value={brand.wordsPerLine} min={1} max={7} onChange={(v) => set("wordsPerLine", v)} />
      </div>
      <label className="check">
        <input type="checkbox" checked={brand.uppercase} onChange={(e) => set("uppercase", e.target.checked)} />
        ALL CAPS
      </label>
    </Card>
  );
}

export function ColoursCard(props: BrandProps) {
  const { brand } = props;
  const set = setter(props);
  return (
    <Card title="Colours">
      <Label>Key word colour</Label>
      <Swatches value={brand.highlightColor} onChange={(v) => set("highlightColor", v)} />
      <Label>Subtitle colour</Label>
      <Swatches value={brand.textColor} onChange={(v) => set("textColor", v)} />
      {brand.style === "pill" ? (
        <>
          <Label>Text on the pill</Label>
          <Swatches value={brand.highlightTextColor} onChange={(v) => set("highlightTextColor", v)} />
        </>
      ) : null}
      {brand.style === "pop" || brand.style === "accent" || brand.style === "pill" ? (
        <>
          <Label>Outline</Label>
          <Swatches value={brand.outlineColor} onChange={(v) => set("outlineColor", v)} />
        </>
      ) : null}
    </Card>
  );
}

const EMOJIS = ["🔥", "💰", "✨", "💡", "🚀", "❤️", "😂", "👀", "✅", "❌", "⏰", "📈", "🙌", "💸", "🎯"];

export function KeyWordsCard({
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
  const word = words.find((w) => w.id === selected);
  const update = (patch: Partial<Word>) => onChange(words.map((w) => (w.id === selected ? { ...w, ...patch } : w)));

  return (
    <Card title="Key words">
      <div className="row">
        <Label>What you say · bold = key word · tap a word to change it</Label>
        <span className="grow" />
        <button
          className="chip"
          disabled={autoBusy || words.length === 0}
          onClick={async () => {
            setAutoBusy(true);
            await onAuto();
            setAutoBusy(false);
          }}
        >
          {autoBusy ? "Thinking…" : "✨ Let AI pick"}
        </button>
      </div>

      {words.length === 0 ? <p className="muted">No speech was found in this video.</p> : null}

      <p className="transcript">
        {words.map((w) => {
          const now = timeMs >= w.startMs && timeMs < w.endMs;
          return (
            <React.Fragment key={w.id}>
              <span
                role="button"
                tabIndex={0}
                className={["tw", w.highlight && "key", now && "now", selected === w.id && "sel"].filter(Boolean).join(" ")}
                onClick={() => {
                  setSelected(w.id);
                  onSeek(w.startMs);
                }}
              >
                {w.emoji ? `${w.emoji} ` : ""}
                {w.text}
              </span>{" "}
            </React.Fragment>
          );
        })}
      </p>

      {word ? (
        <div className="word-editor">
          <div className="row">
            <input className="grow" value={word.text} onChange={(e) => update({ text: e.target.value })} />
            <button className={`chip ${word.highlight ? "dark" : ""}`} onClick={() => update({ highlight: !word.highlight })}>
              {word.highlight ? "Key word ✓" : "Make key word"}
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
            <button className="link" onClick={() => setSelected(null)}>Done</button>
            <span className="grow" />
            <button
              className="link danger"
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
    </Card>
  );
}
