import React, { useState } from "react";
import { DISPLAY_FONTS, SUBTITLE_FONTS } from "../shared/fonts";
import type { BrandKit, BusinessProfile, Word } from "../shared/types";
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
      <Label>Hook position</Label>
      <Options
        value={props.brand.hookPosition}
        onChange={(v) => set("hookPosition", v)}
        options={[
          { value: "top", label: "Top", note: "top of the reel" },
          { value: "middle", label: "Middle", note: "centre of the frame" },
          { value: "bottom", label: "Lower", note: "above the Reels bar" },
        ]}
      />
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

export function CaptionsCard(props: BrandProps) {
  const { brand } = props;
  const set = setter(props);
  const bubble = brand.style === "pill";
  return (
    <Card title="Captions">
      <Label>Caption style</Label>
      <Options
        value={brand.captionMode}
        onChange={(v) => set("captionMode", v)}
        options={[
          { value: "phrase", label: "Phrase", note: "a few words at a time" },
          { value: "single", label: "One word", note: "one word at a time, bigger" },
        ]}
      />

      <Label>Caption font</Label>
      <FontOptions value={brand.font} fonts={SUBTITLE_FONTS} onChange={(v) => set("font", v)} />

      <Label>Caption colour</Label>
      <Swatches value={brand.textColor} onChange={(v) => set("textColor", v)} />

      <Label>Text edge</Label>
      <Options
        value={brand.textEffect}
        onChange={(v) => set("textEffect", v)}
        options={[
          { value: "shadow", label: "Soft shadow", note: "clean & subtle" },
          { value: "outline", label: "Outline", note: "bold, easy to read" },
        ]}
      />
      {brand.textEffect === "outline" ? (
        <>
          <Label>Outline colour</Label>
          <Swatches value={brand.outlineColor} onChange={(v) => set("outlineColor", v)} />
        </>
      ) : null}

      <div className="divider" />

      <Label>Key words</Label>
      <Options
        value={brand.style}
        onChange={(v) => set("style", v)}
        options={[
          { value: "pill", label: "Bubble", note: "colour block behind the word" },
          { value: "color", label: "Coloured text", note: "the word changes colour" },
          { value: "serif", label: "Serif word", note: "coloured, in your hook font" },
        ]}
      />
      <Label>{bubble ? "Bubble colour" : "Key word colour"}</Label>
      <Swatches value={brand.highlightColor} onChange={(v) => set("highlightColor", v)} />
      {bubble ? (
        <>
          <Label>Text inside the bubble</Label>
          <Swatches value={brand.highlightTextColor} onChange={(v) => set("highlightTextColor", v)} />
        </>
      ) : null}

      <div className="divider" />

      <Label>Caption position</Label>
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
        <Slider label="Caption size" value={brand.fontSize} min={44} max={110} onChange={(v) => set("fontSize", v)} />
        {brand.captionMode === "phrase" ? (
          <Slider label={`Words at once · ${brand.wordsPerLine}`} value={brand.wordsPerLine} min={2} max={7} onChange={(v) => set("wordsPerLine", v)} />
        ) : null}
      </div>
      <label className="check">
        <input type="checkbox" checked={brand.uppercase} onChange={(e) => set("uppercase", e.target.checked)} />
        ALL CAPS
      </label>
    </Card>
  );
}

const EMOJIS = ["🔥", "💰", "✨", "💡", "🚀", "💜", "😂", "👀", "✅", "❌", "⏰", "📈", "🙌", "💸", "🎯"];
const FILLER = /^(u+m+|u+h+|uhm+|erm+|hmm+|mm+|ah+)[,.!?]*$/i;

export const formatLength = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function WordsCard({
  mode, words, outputTimes, timeMs, lengthMs, removePauses, onChange, onRemovePauses, onSeek, onAuto,
}: {
  // "cut": tap words to remove them. "style": tap words to highlight, edit or add an emoji.
  mode: "style" | "cut";
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
  const [selected, setSelected] = useState<string | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const word = words.find((w) => w.id === selected);
  const update = (patch: Partial<Word>) => onChange(words.map((w) => (w.id === selected ? { ...w, ...patch } : w)));
  const fillerCount = words.filter((w) => FILLER.test(w.text.trim()) && !w.cut).length;
  const cutCount = words.filter((w) => w.cut).length;

  return (
    <Card title={mode === "cut" ? "Your cut" : "Key words"}>
      <div className="row">
        <Label>{mode === "cut" ? "Tap a word to cut it · tap again to bring it back" : "Bold = key word · tap a word to change it"}</Label>
        <span className="grow" />
        {mode === "cut" ? <span className="length">{formatLength(lengthMs)} long</span> : null}
      </div>

      {mode === "cut" ? (
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
        </div>
      ) : (
        <div className="row">
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
      )}

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
            <span className="muted small">Cut words in the Cut tab</span>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function SoundCard() {
  return (
    <Card title="Sound">
      <p className="muted">Background music that gets quieter while you talk, and sound effects when things pop on screen, are coming next.</p>
    </Card>
  );
}

export function PostCaptionCard({
  caption, defaultCta, onChange, onWrite,
}: {
  caption: string;
  defaultCta: string;
  onChange: (text: string) => void;
  onWrite: (cta: string) => Promise<void>;
}) {
  const [cta, setCta] = useState(defaultCta);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <Card title="Post caption">
      <Label>Call to action for this post</Label>
      <input value={cta} placeholder='e.g. Comment "VA" and I&apos;ll send you my checklist' onChange={(e) => setCta(e.target.value)} />
      <div className="row">
        <button
          className="chip accent"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onWrite(cta);
            setBusy(false);
          }}
        >
          {busy ? "Writing…" : caption ? "✨ Write a new one" : "✨ Write my caption"}
        </button>
        <span className="grow" />
        {caption ? (
          <button
            className="chip"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(caption);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                // Clipboard can be blocked inside some embeds; the text can still be selected by hand.
              }
            }}
          >
            {copied ? "Copied ✓" : "Copy caption"}
          </button>
        ) : null}
      </div>
      <textarea className="caption-input" rows={9} value={caption} placeholder="Your caption will show up here. You can edit it before copying." onChange={(e) => onChange(e.target.value)} />
    </Card>
  );
}

export function BusinessCard(props: BrandProps) {
  const { business } = props.brand;
  const set = (key: keyof BusinessProfile, value: string) => props.onBrand({ ...props.brand, business: { ...business, [key]: value } });
  return (
    <Card title="About your business">
      <p className="muted small">Fill this in once. It helps Claude write hooks and captions that speak to your ideal client.</p>
      <Label>What you do</Label>
      <input value={business.what} placeholder="e.g. I'm a VA who manages inboxes and calendars" onChange={(e) => set("what", e.target.value)} />
      <Label>Who you help</Label>
      <input value={business.audience} placeholder="e.g. busy coaches and course creators" onChange={(e) => set("audience", e.target.value)} />
      <Label>Your usual call to action</Label>
      <input value={business.cta} placeholder='e.g. DM me "HELP" to book a discovery call' onChange={(e) => set("cta", e.target.value)} />
    </Card>
  );
}
