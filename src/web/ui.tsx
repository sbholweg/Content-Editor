import React, { useEffect } from "react";
import { getFont } from "../remotion/fonts";
import { SWATCHES } from "../shared/brand";

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="serif">{title}</h2>
      {children}
    </section>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="label">{children}</div>;
}

// A tappable option with a small description underneath, like "Instrument Serif / trendy, narrow".
export function Options<T extends string | number>({
  value, options, onChange,
}: {
  value: T;
  options: { value: T; label: string; note?: string; style?: React.CSSProperties }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="options">
      {options.map((o) => (
        <button key={String(o.value)} className={`option ${o.value === value ? "on" : ""}`} onClick={() => onChange(o.value)}>
          <span className="option-label" style={o.style}>{o.label}</span>
          {o.note ? <span className="option-note">{o.value === value ? "current choice" : o.note}</span> : null}
        </button>
      ))}
    </div>
  );
}

// Font options, each shown in its own font.
export function FontOptions({ value, fonts, onChange }: { value: string; fonts: readonly { name: string; note: string }[]; onChange: (v: string) => void }) {
  useEffect(() => {
    fonts.forEach((f) => getFont(f.name));
  }, [fonts]);
  return (
    <Options
      value={value}
      onChange={onChange}
      options={fonts.map((f) => {
        const font = getFont(f.name);
        return {
          value: f.name,
          label: f.name,
          note: f.note,
          style: { fontFamily: font.fontFamily, fontWeight: font.fontWeight, fontStyle: font.fontStyle, fontSize: 17 },
        };
      })}
    />
  );
}

export function Swatches({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const custom = !SWATCHES.some((s) => s.toLowerCase() === value.toLowerCase());
  return (
    <div className="swatches">
      {SWATCHES.map((s) => (
        <button
          key={s}
          aria-label={s}
          className={`swatch ${s.toLowerCase() === value.toLowerCase() ? "on" : ""}`}
          style={{ background: s }}
          onClick={() => onChange(s)}
        />
      ))}
      <label className={`swatch custom ${custom ? "on" : ""}`} style={custom ? { background: value } : undefined} title="Pick any color">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        {custom ? null : "+"}
      </label>
    </div>
  );
}

export function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <Label>{label}</Label>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
