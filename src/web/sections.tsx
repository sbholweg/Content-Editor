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

const EMOJIS = ["🔥", "💰", "✨", "💡", "🚀", "💜", "😂", "👀", "✅", "❌", "⏰", "📈", "🙌", "💸", "🎯"];
const FILLER = /^(u+m+|u+h+|uhm+|erm+|hmm+|mm+|ah+)[,.!?]*$/i;

const formatLength = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function WordsCard({
  words, outputTimes, timeMs, lengthMs, removePauses, onChange, onRemovePauses, onSeek, onAuto,
}: {
  words: Word[];
  // Where each kept word lands in the cut video (cut words aren't included).
  outputTimes: Map<string, { startMs: number; endMs: number }>;
  timeMs: number;
  lengthMs: number;
  removePauses: boolean;
  onChange: (words: Word[]) => void;
  onRemovePauses: (on: boolean) => void;
  onSeek: (ms: number) => void;
  onAuto: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"style" | "cut">("style");
  const [selected, setSelected] = useState<string | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const word = words.find((w) => w.id === selected);
  const update = (patch: Partial<Word>) => onChange(words.map((w) => (w.id === selected ? { ...w, ...patch } : w)));
  const fillerCount = words.filter((w) => FILLER.test(w.text.trim()) && !w.cut).length;
  const cutCount = words.filter((w) => w.cut).length;

  return (
    <Card title="Your words">
      <div className="row">
        <Label>Tap a word to</Label>
        <span className="grow" />
        <span className="length">{formatLength(lengthMs)} long</span>
      </div>
      <Options
        value={mode}
        onChange={(m) => {
          setMode(m);
          setSelected(null);
        }}
        options={[
          { value: "style", label: "Highlight & edit", note: "bold = key word" },
          { value: "cut", label: "Cut", note: "struck out = removed" },
        ]}
      />

      <div className="row">
        <button className={`chip ${removePauses ? "accent" : ""}`} onClick={() => onRemovePauses(!removePauses)}>
          {removePauses ? "✓ Pauses removed" : "Remove pauses"}
        </button>
        <button
          className="chip"
          disabled={fillerCount === 0}
          onClick={() => onChange(words.map((w) => (FILLER.test(w.text.trim()) ? { ...w, cut: true } : w)))}
        >
          {fillerCount > 0 ? `Cut ${fillerCount} um${fillerCount === 1 ? "" : "s"} & uhs` : "No ums found"}
        </button>
        {cutCount > 0 ? (
          <button className="chip" onClick={() => onChange(words.map((w) => ({ ...w, cut: false })))}>
            Undo all cuts
          </button>
        ) : null}
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
          {autoBusy ? "Thinking…" : "✨ Let AI pick key words"}
        </button>
      </div>

      {words.length === 0 ? <p className="muted">No speech was found in this video.</p> : null}

      <p className={`transcript ${mode === "cut" ? "cutting" : ""}`}>
        {words.map((w) => {
          const out = outputTimes.get(w.id);
          const now = out !== undefined && timeMs >= out.startMs && timeMs < out.endMs;
          return (
            <React.Fragment key={w.id}>
              <span
                role="button"
                tabIndex={0}
                className={["tw", w.highlight && "key", w.cut && "cut", now && "now", selected === w.id && "sel"].filter(Boolean).join(" ")}
                onClick={() => {
                  if (mode === "cut") {
                    onChange(words.map((x) => (x.id === w.id ? { ...x, cut: !x.cut } : x)));
                    return;
                  }
                  setSelected(w.id);
                  if (out) onSeek(out.startMs);
                }}
              >
                {w.emoji ? `${w.emoji} ` : ""}
                {w.text}
              </span>{" "}
            </React.Fragment>
          );
        })}
      </p>

      {word && mode === "style" ? (
        <div className="word-editor">
          <div className="row">
            <input className="grow" value={word.text} onChange={(e) => update({ text: e.target.value })} />
            <button className={`chip ${word.highlight ? "accent" : ""}`} onClick={() => update({ highlight: !word.highlight })}>
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
                update({ cut: true });
                setSelected(null);
              }}
            >
              Cut this word
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
