import React, { useState } from "react";
import type { BrandKit, BusinessProfile } from "../shared/types";
import { Card, Label } from "./ui";

type BrandProps = { brand: BrandKit; onBrand: (b: BrandKit) => void };

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
