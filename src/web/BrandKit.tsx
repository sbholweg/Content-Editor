import React, { useEffect, useRef, useState } from "react";
import { getFont, registerCustomFonts } from "../remotion/fonts";
import { styleFromBrand } from "../shared/brand";
import { buildBrand, parseHexes, VIBES, type BrandAnswers } from "../shared/brandBuilder";
import type { Asset, BrandColor, BrandKit as Brand, ColorRole } from "../shared/types";
import { api, libraryUrl } from "./api";
import { FontPicker } from "./editor/panels";
import { useUpload } from "./Media";
import { BusinessCard } from "./sections";
import { Label, Options } from "./ui";

const SECTIONS = [
  { id: "cover", label: "Cover" },
  { id: "colors", label: "Colors" },
  { id: "type", label: "Typography" },
  { id: "logo", label: "Logo" },
  { id: "voice", label: "Voice" },
  { id: "business", label: "Business" },
] as const;

const ROLES: { value: ColorRole; label: string }[] = [
  { value: "primary", label: "Main" },
  { value: "accent", label: "Accent" },
  { value: "background", label: "Background" },
  { value: "text", label: "Text" },
  { value: "extra", label: "Extra" },
];

// Your brand guide as a page: colors, fonts, logo and voice. Every reel, carousel and story
// starts from it, and Claude follows it when writing.
export function BrandKitPage({ onBack, onAuthError }: { onBack: () => void; onAuthError: (err: unknown) => void }) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [mode, setMode] = useState<"start" | "build" | "kit">("kit");
  const [applied, setApplied] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    api.getBrand().then((b) => {
      setBrand(b);
      if (!b.setUp) setMode("start");
    }, onAuthError);
    api.listAssets().then(setAssets, onAuthError);
  }, [onAuthError]);

  useEffect(() => {
    registerCustomFonts(assets.filter((a) => a.kind === "font").map((a) => ({ name: a.name, url: libraryUrl(a.file) })));
  }, [assets]);

  const save = (next: Brand) => {
    setBrand(next);
    setApplied(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => api.saveBrand(next).catch(onAuthError), 500);
  };

  if (!brand) return <div className="center muted">Loading…</div>;

  if (mode === "start") {
    return (
      <main className="page stack">
        <button className="link" onClick={onBack}>‹ My reels</button>
        <h1 className="serif">Your brand kit</h1>
        <p className="muted">Every reel, carousel and story in your look. Set it up once.</p>
        <div className="upload-choices">
          <button className="upload-choice primary" onClick={() => setMode("build")}>
            <strong>✨ Build my brand</strong>
            <span>Don't have one yet? Answer a few questions and get colors, fonts and a voice that go together.</span>
          </button>
          <button className="upload-choice" onClick={() => (save({ ...brand, setUp: true }), setMode("kit"))}>
            <strong>I already have a brand</strong>
            <span>Add your colors, fonts and logo. Or drop your brand guide into the chat and tell Claude “set up my brand from this”.</span>
          </button>
        </div>
      </main>
    );
  }

  if (mode === "build") {
    return (
      <BrandBuilder
        brand={brand}
        onBack={() => setMode(brand.setUp ? "kit" : "start")}
        onDone={(next) => {
          // A freshly built brand becomes the default look right away.
          save({ ...next, defaultStyle: styleFromBrand(next, next.defaultStyle) });
          setMode("kit");
        }}
      />
    );
  }

  const yours = assets.filter((a) => a.kind === "font").map((a) => ({ name: a.name, note: "your font" }));
  const logo = assets.find((a) => a.id === brand.logoAssetId);
  const primary = brand.palette.find((c) => c.role === "primary")?.hex ?? "#8656F6";
  const bg = brand.palette.find((c) => c.role === "background")?.hex ?? "#FBF9FF";
  const ink = brand.palette.find((c) => c.role === "text")?.hex ?? "#1E1533";

  return (
    <main className="kit">
      <aside className="kit-nav">
        <button className="link" onClick={onBack}>‹ My reels</button>
        <div className="kit-name">
          <strong>{brand.name}</strong>
          <span className="muted small">Brand kit</span>
        </div>
        <nav>
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#kit-${s.id}`} onClick={(e) => (e.preventDefault(), document.getElementById(`kit-${s.id}`)?.scrollIntoView({ behavior: "smooth" }))}>
              <span className="mono muted">{String(i + 1).padStart(2, "0")}</span> {s.label}
            </a>
          ))}
        </nav>
        <button className="chip" onClick={() => setMode("build")}>✨ Rebuild from questions</button>
      </aside>

      <div className="kit-body">
        <section id="kit-cover" className="kit-cover" style={{ background: bg, color: ink }}>
          {logo ? <img className="kit-logo" src={libraryUrl(logo.file)} alt="" /> : null}
          <input
            className="kit-title"
            value={brand.name}
            onChange={(e) => save({ ...brand, name: e.target.value })}
            style={{ ...fontStyle(brand.fonts.headline), color: ink }}
            aria-label="Brand name"
          />
          <input
            className="kit-tagline"
            value={brand.tagline}
            placeholder="Your tagline"
            onChange={(e) => save({ ...brand, tagline: e.target.value })}
            style={{ ...fontStyle(brand.fonts.body), color: ink }}
          />
          <div className="kit-cover-swatches">
            {brand.palette.map((c) => (
              <span key={c.hex + c.role} style={{ background: c.hex }} title={`${c.name} ${c.hex}`} />
            ))}
          </div>
          <div className="row">
            <button
              className="btn primary"
              style={{ background: primary, borderColor: primary }}
              onClick={async () => {
                const next = { ...brand, defaultStyle: styleFromBrand(brand, brand.defaultStyle) };
                setBrand(next);
                await api.saveBrand(next).catch(onAuthError);
                setApplied(true);
              }}
            >
              {applied ? "✓ New reels use your brand" : "Use my brand on new reels"}
            </button>
          </div>
          <p className="small" style={{ opacity: 0.7 }}>
            Your fonts and main color become your default look. For a reel you've already made, open Visuals › Looks › My default.
          </p>
        </section>

        <section id="kit-colors" className="panel-card">
          <h2>Colors</h2>
          <p className="muted small">These are the colors offered everywhere in the editor. Keep it to a few that go together.</p>
          <div className="kit-colors">
            {brand.palette.map((c, i) => (
              <ColorCard
                key={i}
                color={c}
                onChange={(next) => save({ ...brand, palette: brand.palette.map((x, j) => (j === i ? next : x)) })}
                onRemove={() => save({ ...brand, palette: brand.palette.filter((_, j) => j !== i) })}
              />
            ))}
            <button
              className="kit-color add"
              onClick={() => save({ ...brand, palette: [...brand.palette, { hex: "#8656F6", name: "New color", role: brand.palette.length ? "extra" : "primary" }] })}
            >
              ＋ Add a color
            </button>
          </div>
          <PasteHexes onColors={(hexes) => save({ ...brand, palette: [...brand.palette, ...hexes.map((hex, i) => ({ hex, name: `Color ${brand.palette.length + i + 1}`, role: (brand.palette.length + i === 0 ? "primary" : "extra") as ColorRole }))] })} />
        </section>

        <section id="kit-type" className="panel-card">
          <h2>Typography</h2>
          <p className="muted small">Three fonts, one job each. The same ones in every reel, carousel and story.</p>
          {(
            [
              ["headline", "Headline", "Hooks, titles and the big words on slides", "this is a headline"],
              ["body", "Captions", "Every word you say, and body text", "this is a caption"],
              ["accent", "Accent", "Handwritten touches and little notes", "this is an accent"],
            ] as const
          ).map(([key, label, use, sample]) => (
            <div key={key} className="kit-font">
              <div className="kit-font-aa" style={fontStyle(brand.fonts[key])}>Aa</div>
              <div className="grow stack tight">
                <span className="label">{label} · {use}</span>
                <strong style={{ ...fontStyle(brand.fonts[key]), fontSize: 26 }}>{brand.fonts[key]}</strong>
                <span style={{ ...fontStyle(brand.fonts[key]), fontSize: 20 }}>{sample}</span>
                <details>
                  <summary className="link">Change font</summary>
                  <FontPicker value={brand.fonts[key]} yours={yours} onChange={(v) => save({ ...brand, fonts: { ...brand.fonts, [key]: v } })} />
                </details>
              </div>
            </div>
          ))}
          <p className="muted small">Have your own font files? Upload them in any reel under Visuals › Fonts & colours and they appear here.</p>
        </section>

        <section id="kit-logo" className="panel-card">
          <h2>Logo</h2>
          <LogoUpload brand={brand} assets={assets} onAssets={setAssets} onBrand={save} onAuthError={onAuthError} />
        </section>

        <section id="kit-voice" className="panel-card">
          <h2>Voice</h2>
          <p className="muted small">How you sound. Claude follows this when it writes your hooks, captions and slides.</p>
          <Label>Your vibe</Label>
          <div className="options">
            {VIBES.map((v) => {
              const word = v.label.toLowerCase();
              const on = brand.voice.tone.includes(word);
              return (
                <button
                  key={v.id}
                  className={`option ${on ? "on" : ""}`}
                  onClick={() => save({ ...brand, voice: { ...brand.voice, tone: on ? brand.voice.tone.filter((t) => t !== word) : [...brand.voice.tone, word] } })}
                >
                  <span className="option-label">{v.label}</span>
                </button>
              );
            })}
          </div>
          <ListField label="Phrases you say a lot" placeholder="e.g. let's get you some time back" items={brand.voice.phrases} onChange={(phrases) => save({ ...brand, voice: { ...brand.voice, phrases } })} />
          <ListField label="Words to never use" placeholder="e.g. hustle, boss babe" items={brand.voice.avoid} onChange={(avoid) => save({ ...brand, voice: { ...brand.voice, avoid } })} />
        </section>

        <div id="kit-business">
          <BusinessCard brand={brand} onBrand={save} />
        </div>
      </div>
    </main>
  );
}

function fontStyle(name: string): React.CSSProperties {
  const f = getFont(name);
  return { fontFamily: f.fontFamily, fontWeight: f.fontWeight, fontStyle: f.fontStyle };
}

function ColorCard({ color, onChange, onRemove }: { color: BrandColor; onChange: (c: BrandColor) => void; onRemove: () => void }) {
  const [hex, setHex] = useState(color.hex);
  useEffect(() => setHex(color.hex), [color.hex]);
  return (
    <div className="kit-color">
      <label className="kit-chip" style={{ background: color.hex }}>
        <input type="color" value={color.hex} onChange={(e) => onChange({ ...color, hex: e.target.value.toUpperCase() })} />
      </label>
      <input className="kit-color-name" value={color.name} onChange={(e) => onChange({ ...color, name: e.target.value })} />
      <input
        className="mono kit-hex"
        value={hex}
        onChange={(e) => {
          setHex(e.target.value);
          const [parsed] = parseHexes(e.target.value);
          if (parsed) onChange({ ...color, hex: parsed });
        }}
      />
      <select value={color.role} onChange={(e) => onChange({ ...color, role: e.target.value as ColorRole })}>
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <button className="link danger small" onClick={onRemove}>Remove</button>
    </div>
  );
}

function PasteHexes({ onColors }: { onColors: (hexes: string[]) => void }) {
  const [text, setText] = useState("");
  const found = parseHexes(text);
  return (
    <div className="row">
      <input className="grow" value={text} placeholder="Paste hex codes, e.g. #8656F6, #E85BDB, #CEFC7E" onChange={(e) => setText(e.target.value)} />
      <button
        className="chip"
        disabled={!found.length}
        onClick={() => {
          onColors(found);
          setText("");
        }}
      >
        Add {found.length || ""} color{found.length === 1 ? "" : "s"}
      </button>
    </div>
  );
}

function ListField({ label, placeholder, items, onChange }: { label: string; placeholder: string; items: string[]; onChange: (items: string[]) => void }) {
  const [text, setText] = useState("");
  return (
    <>
      <Label>{label}</Label>
      {items.length ? (
        <div className="saved-ctas">
          {items.map((t) => (
            <span key={t} className="chip cta">
              {t}
              <button aria-label="Remove" onClick={() => onChange(items.filter((x) => x !== t))}>×</button>
            </span>
          ))}
        </div>
      ) : null}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onChange([...items, text.trim()]);
          setText("");
        }}
      >
        <input className="grow" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
        <button className="chip" type="submit" disabled={!text.trim()}>Add</button>
      </form>
    </>
  );
}

function LogoUpload({
  brand, assets, onAssets, onBrand, onAuthError,
}: {
  brand: Brand;
  assets: Asset[];
  onAssets: (a: Asset[]) => void;
  onBrand: (b: Brand) => void;
  onAuthError: (err: unknown) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { progress, error, upload } = useUpload((a) => {
    onAssets([a, ...assets]);
    onBrand({ ...brand, logoAssetId: a.id });
  }, onAuthError);
  const logo = assets.find((a) => a.id === brand.logoAssetId);
  return (
    <div className="row">
      <div className="kit-logo-box">{logo ? <img src={libraryUrl(logo.file)} alt="Your logo" /> : <span className="muted small">No logo yet</span>}</div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="stack tight">
        <button className="chip accent" disabled={progress !== null} onClick={() => input.current?.click()}>
          {progress === null ? (logo ? "Replace logo" : "＋ Upload your logo") : `Uploading ${Math.round(progress * 100)}%`}
        </button>
        <span className="muted small">A PNG with a transparent background works best.</span>
        {error ? <span className="error small">{error}</span> : null}
      </div>
    </div>
  );
}

function BrandBuilder({ brand, onBack, onDone }: { brand: Brand; onBack: () => void; onDone: (b: Brand) => void }) {
  const [answers, setAnswers] = useState<BrandAnswers>({
    name: brand.name === "My Brand" ? "" : brand.name,
    what: brand.business.what,
    audience: brand.business.audience,
    vibes: [],
    color: brand.palette.find((c) => c.role === "primary")?.hex ?? "#8656F6",
  });
  const set = (patch: Partial<BrandAnswers>) => setAnswers({ ...answers, ...patch });
  const preview = buildBrand({ ...answers, vibes: answers.vibes.length ? answers.vibes : ["calm"] }, brand);

  return (
    <main className="page stack">
      <button className="link" onClick={onBack}>‹ Back</button>
      <h1 className="serif">Build my brand</h1>
      <p className="muted">A few quick questions. You can change everything afterwards.</p>

      <section className="panel-card">
        <Label>Your business name</Label>
        <input value={answers.name} placeholder="e.g. The Calm Inbox Co." onChange={(e) => set({ name: e.target.value })} />
        <Label>What you do</Label>
        <input value={answers.what} placeholder="e.g. I'm a VA who manages inboxes and calendars" onChange={(e) => set({ what: e.target.value })} />
        <Label>Who you help</Label>
        <input value={answers.audience} placeholder="e.g. busy coaches and course creators" onChange={(e) => set({ audience: e.target.value })} />
        <Label>Your vibe (pick up to 3, the first one sets your fonts)</Label>
        <Options
          value={answers.vibes[0] ?? ""}
          onChange={(id) => {
            const has = answers.vibes.includes(id);
            set({ vibes: has ? answers.vibes.filter((v) => v !== id) : [...answers.vibes, id].slice(0, 3) });
          }}
          options={VIBES.map((v) => ({
            value: v.id,
            label: `${answers.vibes.includes(v.id) ? `${answers.vibes.indexOf(v.id) + 1}. ` : ""}${v.label}`,
            style: fontStyle(v.fonts.headline),
          }))}
        />
        <Label>A color you love</Label>
        <div className="row">
          <label className="kit-chip big" style={{ background: answers.color }}>
            <input type="color" value={answers.color} onChange={(e) => set({ color: e.target.value.toUpperCase() })} />
          </label>
          <span className="muted small">Tap to pick. We'll build a palette around it.</span>
        </div>
      </section>

      <section className="panel-card">
        <h3>Your brand, so far</h3>
        <div className="kit-cover small-cover" style={{ background: preview.palette[2].hex, color: preview.palette[3].hex }}>
          <div style={{ ...fontStyle(preview.fonts.headline), fontSize: 40, lineHeight: 1.05 }}>{preview.name}</div>
          <div style={{ ...fontStyle(preview.fonts.body), fontSize: 16 }}>
            {answers.what || "What you do"} · for {answers.audience || "who you help"}
          </div>
          <div style={{ ...fontStyle(preview.fonts.accent), fontSize: 22, color: preview.palette[0].hex }}>a little note in your accent font</div>
          <div className="kit-cover-swatches">
            {preview.palette.map((c) => (
              <span key={c.role} style={{ background: c.hex }} />
            ))}
          </div>
        </div>
        <button className="btn primary" onClick={() => onDone(buildBrand(answers.vibes.length ? answers : { ...answers, vibes: ["calm"] }, brand))}>
          Save my brand kit
        </button>
        <p className="muted small">Want it smarter? After saving, tell Claude “refine my brand kit” and it'll tune the colors, fonts and voice to your business.</p>
      </section>
    </main>
  );
}
