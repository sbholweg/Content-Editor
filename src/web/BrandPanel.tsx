import React from "react";
import { FONT_OPTIONS } from "../shared/fonts";
import type { BrandKit } from "../shared/types";

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button key={v} className={v === value ? "on" : ""} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="color">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span>{label}</span>
    </label>
  );
}

export function BrandPanel({ brand, onChange }: { brand: BrandKit; onChange: (b: BrandKit) => void }) {
  const set = <K extends keyof BrandKit>(key: K, value: BrandKit[K]) => onChange({ ...brand, [key]: value });

  return (
    <div className="stack">
      <p className="muted small">Your brand is saved and used on every reel.</p>

      <div className="field">
        <span>Highlight style</span>
        <Segmented value={brand.style} onChange={(v) => set("style", v)} options={[["pill", "Pill"], ["pop", "Color pop"], ["accent", "Accent font"]]} />
      </div>

      <div className="field">
        <span>Position</span>
        <Segmented value={brand.position} onChange={(v) => set("position", v)} options={[["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]]} />
      </div>

      <div className="grid2">
        <label className="field">
          <span>Main font</span>
          <select value={brand.font} onChange={(e) => set("font", e.target.value)}>
            {FONT_OPTIONS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Accent font</span>
          <select value={brand.accentFont} onChange={(e) => set("accentFont", e.target.value)}>
            {FONT_OPTIONS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
      </div>

      <div className="colors">
        <Color label="Highlight" value={brand.highlightColor} onChange={(v) => set("highlightColor", v)} />
        <Color label="Text on highlight" value={brand.highlightTextColor} onChange={(v) => set("highlightTextColor", v)} />
        <Color label="Caption text" value={brand.textColor} onChange={(v) => set("textColor", v)} />
        <Color label="Outline" value={brand.outlineColor} onChange={(v) => set("outlineColor", v)} />
      </div>

      <label className="field">
        <span>Words on screen at once: {brand.wordsPerLine}</span>
        <input type="range" min={1} max={6} value={brand.wordsPerLine} onChange={(e) => set("wordsPerLine", Number(e.target.value))} />
      </label>

      <label className="field">
        <span>Text size</span>
        <input type="range" min={48} max={120} value={brand.fontSize} onChange={(e) => set("fontSize", Number(e.target.value))} />
      </label>

      <label className="row">
        <input type="checkbox" checked={brand.uppercase} onChange={(e) => set("uppercase", e.target.checked)} />
        <span>ALL CAPS</span>
      </label>
    </div>
  );
}
