import React, { useState } from "react";
import { DISPLAY_FONTS, SUBTITLE_FONTS } from "../shared/fonts";
import { HOOK_LIBRARY } from "../shared/library";
import { isFiller } from "../shared/words";
import type { BrandKit, BusinessProfile, ReelStyle, Word } from "../shared/types";
import { Card, FontOptions, Label, Options, Slider, Swatches } from "./ui";

type BrandProps = { brand: BrandKit; onBrand: (b: BrandKit) => void };
// The current reel's look.
type LookProps = { look: ReelStyle; onLook: (s: ReelStyle) => void };
const setter = ({ look, onLook }: LookProps) => <K extends keyof ReelStyle>(key: K, value: ReelStyle[K]) => onLook({ ...look, [key]: value });

// Saved combinations of fonts and colors, applied to this reel in one tap.
export function LooksCard({ look, onLook, brand, onBrand }: LookProps & BrandProps) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const same = (a: ReelStyle, b: ReelStyle) => JSON.stringify(a) === JSON.stringify(b);
  const isDefault = same(look, brand.defaultStyle);
  return (
    <Card title="Your looks">
      <p className="muted small">Tap a look to use it on this reel. Changes below only affect this reel until you save them.</p>
      <div className="options">
        <button className={`option ${isDefault ? "on" : ""}`} onClick={() => onLook(brand.defaultStyle)}>
          <span className="option-label">My default</span>
          <span className="option-note">used for every new reel</span>
        </button>
        {brand.looks.map((l) => (
          <span key={l.id} className={`option look ${same(look, l.style) ? "on" : ""}`}>
            <button className="look-apply" onClick={() => onLook(l.style)}>
              <span className="option-label">{l.name}</span>
              <span className="option-note">saved look</span>
            </button>
            <button
              className="look-remove"
              aria-label={`Delete ${l.name}`}
              onClick={() => {
                if (confirm(`Delete the look "${l.name}"?`)) onBrand({ ...brand, looks: brand.looks.filter((x) => x.id !== l.id) });
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {naming ? (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onBrand({ ...brand, looks: [...brand.looks, { id: `look-${Date.now()}`, name: name.trim(), style: look }] });
            setName("");
            setNaming(false);
          }}
        >
          <input className="grow" autoFocus value={name} placeholder="Name this look, e.g. Soft & classy" onChange={(e) => setName(e.target.value)} />
          <button className="chip accent" type="submit">Save</button>
          <button className="link" type="button" onClick={() => setNaming(false)}>Cancel</button>
        </form>
      ) : (
        <div className="row">
          <button className="chip" onClick={() => setNaming(true)}>＋ Save this as a look</button>
          <button className="chip" disabled={isDefault} onClick={() => onBrand({ ...brand, defaultStyle: look })}>
            {isDefault ? "✓ This is your default" : "Make this my default"}
          </button>
        </div>
      )}
    </Card>
  );
}

export function HookCard({ hookText, onHookText, ...props }: LookProps & { hookText: string; onHookText: (t: string) => void }) {
  const set = setter(props);
  const [browsing, setBrowsing] = useState(false);
  const [role, setRole] = useState<string>(HOOK_LIBRARY[0].role);
  return (
    <Card title="Hook">
      <div className="row">
        <Label>Title on the reel</Label>
        <span className="grow" />
        <button className="chip" onClick={() => setBrowsing(!browsing)}>{browsing ? "Close hook library" : "📚 Hook library"}</button>
      </div>
      {browsing ? (
        <div className="library">
          <Options value={role} onChange={setRole} options={HOOK_LIBRARY.map((g) => ({ value: g.role, label: g.role }))} />
          <p className="muted small">Tap one to use it, then swap the [brackets] for your own words.</p>
          <div className="library-list">
            {HOOK_LIBRARY.find((g) => g.role === role)?.hooks.map((h) => (
              <button
                key={h}
                className="library-item serif"
                onClick={() => {
                  onHookText(h);
                  setBrowsing(false);
                }}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <textarea
        className="hook-input serif"
        rows={2}
        value={hookText}
        placeholder="nobody's saying it, so I will"
        onChange={(e) => onHookText(e.target.value)}
      />
      <Label>Hook font</Label>
      <FontOptions value={props.look.displayFont} fonts={DISPLAY_FONTS} onChange={(v) => set("displayFont", v)} />
      <Label>Hook colour</Label>
      <Swatches value={props.look.hookColor} onChange={(v) => set("hookColor", v)} />
      <Label>Hook position</Label>
      <Options
        value={props.look.hookPosition}
        onChange={(v) => set("hookPosition", v)}
        options={[
          { value: "top", label: "Top", note: "top of the reel" },
          { value: "middle", label: "Middle", note: "centre of the frame" },
          { value: "bottom", label: "Lower", note: "above the Reels bar" },
        ]}
      />
      <Label>Stays on screen</Label>
      <Options
        value={props.look.hookDurationMs}
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

export function CaptionsCard(props: LookProps) {
  const { look } = props;
  const set = setter(props);
  const bubble = look.style === "pill";
  return (
    <Card title="Captions">
      <Label>Caption style</Label>
      <Options
        value={look.captionMode}
        onChange={(v) => set("captionMode", v)}
        options={[
          { value: "phrase", label: "Phrase", note: "a few words at a time" },
          { value: "single", label: "One word", note: "one word at a time, bigger" },
        ]}
      />

      <Label>Caption font</Label>
      <FontOptions value={look.font} fonts={SUBTITLE_FONTS} onChange={(v) => set("font", v)} />

      <Label>Caption colour</Label>
      <Swatches value={look.textColor} onChange={(v) => set("textColor", v)} />

      <Label>Text edge</Label>
      <Options
        value={look.textEffect}
        onChange={(v) => set("textEffect", v)}
        options={[
          { value: "shadow", label: "Soft shadow", note: "clean & subtle" },
          { value: "outline", label: "Outline", note: "bold, easy to read" },
        ]}
      />
      {look.textEffect === "outline" ? (
        <>
          <Label>Outline colour</Label>
          <Swatches value={look.outlineColor} onChange={(v) => set("outlineColor", v)} />
        </>
      ) : null}

      <div className="divider" />

      <Label>Key words</Label>
      <Options
        value={look.style}
        onChange={(v) => set("style", v)}
        options={[
          { value: "pill", label: "Bubble", note: "colour block behind the word" },
          { value: "color", label: "Coloured text", note: "the word changes colour" },
          { value: "serif", label: "Serif word", note: "coloured, in your hook font" },
        ]}
      />
      <Label>{bubble ? "Bubble colour" : "Key word colour"}</Label>
      <Swatches value={look.highlightColor} onChange={(v) => set("highlightColor", v)} />
      {bubble ? (
        <>
          <Label>Text inside the bubble</Label>
          <Swatches value={look.highlightTextColor} onChange={(v) => set("highlightTextColor", v)} />
        </>
      ) : null}

      <div className="divider" />

      <Label>Caption position</Label>
      <Options
        value={look.position}
        onChange={(v) => set("position", v)}
        options={[
          { value: "top", label: "Top", note: "under the hook" },
          { value: "middle", label: "Middle", note: "centre of the frame" },
          { value: "bottom", label: "Lower", note: "just above the Reels bar" },
        ]}
      />
      <div className="two">
        <Slider label="Caption size" value={look.fontSize} min={44} max={110} onChange={(v) => set("fontSize", v)} />
        {look.captionMode === "phrase" ? (
          <Slider label={`Words at once · ${look.wordsPerLine}`} value={look.wordsPerLine} min={2} max={7} onChange={(v) => set("wordsPerLine", v)} />
        ) : null}
      </div>
      <label className="check">
        <input type="checkbox" checked={look.uppercase} onChange={(e) => set("uppercase", e.target.checked)} />
        ALL CAPS
      </label>
    </Card>
  );
}

const EMOJIS = ["🔥", "💰", "✨", "💡", "🚀", "💜", "😂", "👀", "✅", "❌", "⏰", "📈", "🙌", "💸", "🎯"];

export const formatLength = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function WordsCard({
  mode, words, outputTimes, timeMs, lengthMs, removePauses, onChange, onRemovePauses, onSeek, onAuto, onAddMedia,
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
  onAddMedia?: (wordId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const word = words.find((w) => w.id === selected);
  const update = (patch: Partial<Word>) => onChange(words.map((w) => (w.id === selected ? { ...w, ...patch } : w)));
  const fillerCount = words.filter((w) => isFiller(w.text) && !w.cut).length;
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
            onClick={() => onChange(words.map((w) => (isFiller(w.text) ? { ...w, cut: true } : w)))}
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
          {onAddMedia ? (
            <button className="chip" onClick={() => onAddMedia(word.id)}>🖼️ Add image, GIF or b-roll here</button>
          ) : null}
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
  caption, brand, onBrand, onChange, onWrite,
}: BrandProps & {
  caption: string;
  onChange: (text: string) => void;
  onWrite: (cta: string) => Promise<void>;
}) {
  const [cta, setCta] = useState(brand.ctaKeywords[0] ?? brand.business.cta);
  const saved = brand.ctaKeywords.includes(cta.trim());
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <Card title="Post caption">
      <Label>Call to action for this post</Label>
      {brand.ctaKeywords.length ? (
        <div className="saved-ctas">
          {brand.ctaKeywords.map((k) => (
            <span key={k} className={`chip cta ${k === cta.trim() ? "accent" : ""}`}>
              <button onClick={() => setCta(k)}>{k}</button>
              <button aria-label="Remove" onClick={() => onBrand({ ...brand, ctaKeywords: brand.ctaKeywords.filter((x) => x !== k) })}>×</button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="row">
        <input className="grow" value={cta} placeholder='e.g. Comment "VA" and I&apos;ll send you my checklist' onChange={(e) => setCta(e.target.value)} />
        <button
          className="chip"
          disabled={!cta.trim() || saved}
          onClick={() => onBrand({ ...brand, ctaKeywords: [...brand.ctaKeywords, cta.trim()] })}
        >
          {saved ? "Saved ✓" : "Save for later"}
        </button>
      </div>
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
