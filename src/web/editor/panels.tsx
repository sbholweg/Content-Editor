import { Thumbnail } from "@remotion/player";
import React, { useRef, useState } from "react";
import { outputFrames, Reel, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from "../../remotion/Reel";
import { swatchesFor } from "../../shared/brand";
import { FONT_GROUPS } from "../../shared/fonts";
import { HOOK_LIBRARY } from "../../shared/library";
import type { HookLayout, ReelProps, ReelStyle } from "../../shared/types";
import { useUpload } from "../Media";
import { FontOptions, Label, Options, Slider, Swatches } from "../ui";
import { useEditor } from "./context";

function useLook() {
  const { reel, update } = useEditor();
  const set = <K extends keyof ReelStyle>(key: K, value: ReelStyle[K]) => update({ style: { ...reel.style, [key]: value } });
  return { look: reel.style, set };
}

export function CaptionsPanel() {
  const { look, set } = useLook();
  const { brand } = useEditor();
  return (
    <div className="panel-body">
      <Label>Caption style</Label>
      <Options
        value={look.captionMode}
        onChange={(v) => set("captionMode", v)}
        options={[
          { value: "phrase", label: "Phrase", note: "a few words at a time" },
          { value: "single", label: "Single word", note: "one word at a time, bigger" },
          { value: "karaoke", label: "Karaoke", note: "words light up as you say them" },
        ]}
      />
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
      <Label>Caption position</Label>
      <Options
        value={look.position}
        onChange={(v) => set("position", v)}
        options={[
          { value: "top", label: "Top", note: "or eye level, if beside you" },
          { value: "middle", label: "Middle", note: "centre of the frame" },
          { value: "bottom", label: "Lower", note: "just above the Reels bar" },
        ]}
      />
      <Label>Left, center or right</Label>
      <Options
        value={look.captionAlign}
        onChange={(v) => set("captionAlign", v)}
        options={[
          { value: "center", label: "Center", note: "classic" },
          { value: "left", label: "Left of me", note: "beside your head" },
          { value: "right", label: "Right of me", note: "beside your head" },
        ]}
      />
      <Label>Text edge</Label>
      <Options
        value={look.textEffect}
        onChange={(v) => set("textEffect", v)}
        options={[
          { value: "shadow", label: "Soft shadow", note: "clean & subtle" },
          { value: "outline", label: "Outline", note: "bold, easy to read" },
        ]}
      />
      <div className="two">
        <Slider label="Caption size" value={look.fontSize} min={44} max={110} onChange={(v) => set("fontSize", v)} />
        {look.captionMode !== "single" ? (
          <Slider label={`Words at once · ${look.wordsPerLine}`} value={look.wordsPerLine} min={2} max={7} onChange={(v) => set("wordsPerLine", v)} />
        ) : null}
      </div>
      <label className="check">
        <input type="checkbox" checked={look.uppercase} onChange={(e) => set("uppercase", e.target.checked)} />
        ALL CAPS
      </label>
      <label className="check">
        <input type="checkbox" checked={look.captionsOn !== false} onChange={(e) => set("captionsOn", e.target.checked)} />
        Show captions
      </label>
      <Label>Your logo on the reel</Label>
      {brand.logoAssetId ? (
        <Options
          value={look.logo ?? "off"}
          onChange={(v) => set("logo", v)}
          options={[
            { value: "off", label: "Off" },
            { value: "top-left", label: "Top left" },
            { value: "top-right", label: "Top right" },
            { value: "bottom-right", label: "Bottom right" },
          ]}
        />
      ) : (
        <p className="muted small">Upload your logo in your <a href="#/brand">Brand kit</a> to add it here.</p>
      )}
      <label className="check">
        <input type="checkbox" checked={look.zoomJumps} onChange={(e) => set("zoomJumps", e.target.checked)} />
        Zoom jumps (punch in on every other line)
      </label>
    </div>
  );
}

const LAYOUTS: { value: HookLayout; label: string }[] = [
  { value: "headline", label: "Hook" },
  { value: "eyebrow", label: "Eyebrow + headline" },
  { value: "subhead", label: "Headline + subhead" },
];

// A still frame of this reel with a different hook layout, so you can see each one before picking.
function HookPreview({ props, layout }: { props: ReelProps; layout: HookLayout }) {
  const preview: ReelProps = {
    ...props,
    hookSubText: props.hookSubText || (layout === "eyebrow" ? "for service providers" : "here's what changed"),
    brand: { ...props.brand, hookLayout: layout, hookDurationMs: 0 },
  };
  return (
    <Thumbnail
      component={Reel}
      inputProps={preview}
      frameToDisplay={12}
      durationInFrames={outputFrames(preview)}
      fps={REEL_FPS}
      compositionWidth={REEL_WIDTH}
      compositionHeight={REEL_HEIGHT}
      style={{ width: "100%", aspectRatio: "9 / 16", borderRadius: 14, overflow: "hidden" }}
    />
  );
}

export function HookPanel({ previewProps }: { previewProps: ReelProps }) {
  const { reel, update } = useEditor();
  const { look, set } = useLook();
  const [browsing, setBrowsing] = useState(false);
  const [role, setRole] = useState<string>(HOOK_LIBRARY[0].role);

  return (
    <div className="panel-body">
      <div className="row">
        <Label>Your hook</Label>
        <span className="grow" />
        <button className="chip" onClick={() => setBrowsing(!browsing)}>{browsing ? "Close library" : "📚 Hook library"}</button>
      </div>
      {browsing ? (
        <div className="library">
          <Options value={role} onChange={setRole} options={HOOK_LIBRARY.map((g) => ({ value: g.role, label: g.role }))} />
          <p className="muted small">Tap one to use it, then swap the [brackets] for your own words.</p>
          <div className="library-list">
            {HOOK_LIBRARY.find((g) => g.role === role)?.hooks.map((h) => (
              <button
                key={h}
                className="library-item"
                onClick={() => {
                  update({ hookText: h });
                  setBrowsing(false);
                }}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <input className="hook-input" value={reel.hookText} placeholder="I have zero time to edit reels" onChange={(e) => update({ hookText: e.target.value })} />
      <input
        value={reel.hookSubText}
        placeholder="Second, smaller line (optional)"
        onChange={(e) => update({ hookSubText: e.target.value })}
      />

      <Label>Swap this look</Label>
      <div className="lookbook">
        {LAYOUTS.map((l) => (
          <button key={l.value} className={`lookbook-item ${look.hookLayout === l.value ? "on" : ""}`} onClick={() => set("hookLayout", l.value)}>
            <HookPreview props={previewProps} layout={l.value} />
            {look.hookLayout === l.value ? <span className="on-badge">On this reel</span> : null}
            <span className="lookbook-label">{l.label}</span>
          </button>
        ))}
      </div>

      <Label>Where it sits</Label>
      <p className="muted small">Or tap “✥ Move” above the preview and drag it anywhere.{look.hookPlace ? " (It's in a spot you dragged it to; pick one below to reset.)" : ""}</p>
      <Options
        value={look.hookPlace ? ("custom" as ReelStyle["hookPosition"]) : look.hookPosition}
        onChange={(v) => update({ style: { ...reel.style, hookPosition: v, hookPlace: null } })}
        options={[
          { value: "top", label: "Top", note: "top of the reel" },
          { value: "middle", label: "Middle", note: "centre of the frame" },
          { value: "bottom", label: "Lower", note: "above the Reels bar" },
        ]}
      />
      <Label>Stays on screen</Label>
      <Options
        value={look.hookDurationMs}
        onChange={(v) => set("hookDurationMs", v)}
        options={[
          { value: 3000, label: "3 seconds" },
          { value: 5000, label: "5 seconds" },
          { value: 0, label: "Whole video" },
        ]}
      />
    </div>
  );
}

// Font picker with a row of groups (Clean, Serif, Script & fun, Yours) so the list stays short.
export function FontPicker({ value, yours, onChange }: { value: string; yours: { name: string; note: string }[]; onChange: (v: string) => void }) {
  const groups = [...(yours.length ? [{ label: "Your fonts", fonts: yours }] : []), ...FONT_GROUPS];
  const [group, setGroup] = useState(() => groups.find((g) => g.fonts.some((f) => f.name === value))?.label ?? groups[0].label);
  return (
    <>
      <div className="font-groups">
        {groups.map((g) => (
          <button key={g.label} className={`chip ${group === g.label ? "accent" : ""}`} onClick={() => setGroup(g.label)}>
            {g.label}
          </button>
        ))}
      </div>
      <FontOptions value={value} fonts={groups.find((g) => g.label === group)?.fonts ?? []} onChange={onChange} />
    </>
  );
}

export function FontsPanel() {
  const { assets, setAssets, onAuthError, brand } = useEditor();
  const swatches = swatchesFor(brand);
  const { look, set } = useLook();
  const input = useRef<HTMLInputElement>(null);
  const { progress, error, upload } = useUpload((a) => setAssets([a, ...assets]), onAuthError);
  const yours = assets.filter((a) => a.kind === "font").map((a) => ({ name: a.name, note: "your font" }));
  const bubble = look.style === "pill";

  return (
    <div className="panel-body">
      <div className="row">
        <Label>Your own fonts</Label>
        <span className="grow" />
        <input
          ref={input}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          hidden
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button className="chip accent" disabled={progress !== null} onClick={() => input.current?.click()}>
          {progress === null ? "＋ Upload a font" : `Uploading ${Math.round(progress * 100)}%`}
        </button>
      </div>
      <p className="muted small">Have brand fonts? Upload the font file (.ttf, .otf, .woff or .woff2) and it shows up under “Your fonts” below.</p>
      {error ? <p className="error small">{error}</p> : null}

      <Label>Caption font</Label>
      <FontPicker value={look.font} yours={yours} onChange={(v) => set("font", v)} />
      <Label>Hook & accent font</Label>
      <FontPicker value={look.displayFont} yours={yours} onChange={(v) => set("displayFont", v)} />

      <div className="divider" />
      <div className="colors-grid">
        <div>
          <Label>Caption colour</Label>
          <Swatches colors={swatches} value={look.textColor} onChange={(v) => set("textColor", v)} />
        </div>
        <div>
          <Label>{bubble ? "Bubble colour" : "Key word colour"}</Label>
          <Swatches colors={swatches} value={look.highlightColor} onChange={(v) => set("highlightColor", v)} />
        </div>
        {bubble ? (
          <div>
            <Label>Text in the bubble</Label>
            <Swatches colors={swatches} value={look.highlightTextColor} onChange={(v) => set("highlightTextColor", v)} />
          </div>
        ) : null}
        <div>
          <Label>Hook colour</Label>
          <Swatches colors={swatches} value={look.hookColor} onChange={(v) => set("hookColor", v)} />
        </div>
        {look.textEffect === "outline" ? (
          <div>
            <Label>Outline colour</Label>
            <Swatches colors={swatches} value={look.outlineColor} onChange={(v) => set("outlineColor", v)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
