import React, { useEffect, useRef, useState } from "react";
import { getFont, registerCustomFonts } from "../remotion/fonts";
import { styleFromBrand } from "../shared/brand";
import { buildBrand, parseHexes, VIBES } from "../shared/brandBuilder";
import { TopNav } from "./Brandmark";
import { paletteFromImages } from "./extractColors";
import type { Asset, BrandColor, BrandKit as Brand, ColorRole } from "../shared/types";
import { api, libraryUrl } from "./api";
import { FontPicker } from "./editor/panels";
import { useUpload } from "./Media";
import { BusinessCard } from "./sections";
import { Label } from "./ui";

const SECTIONS = [
  { id: "cover", label: "Cover" },
  { id: "inspo", label: "Inspiration" },
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
      <div className="site">
      <TopNav active="brand" />
      <main className="page stack wide">
        <span className="eyebrow">Brand kit</span>
        <h1 className="display small">Your brand, in every post.</h1>
        <p className="lede">Every reel, carousel and story in your look. Set it up once.</p>
        <div className="upload-choices">
          <button className="upload-choice primary" onClick={() => setMode("build")}>
            <strong>✨ Build my brand</strong>
            <span>Share a few images you love, like a Pinterest board, and get a whole brand built from them: colors, fonts and voice.</span>
          </button>
          <button className="upload-choice" onClick={() => (save({ ...brand, setUp: true }), setMode("kit"))}>
            <strong>I already have a brand</strong>
            <span>Add your colors, fonts and logo. Or drop your brand guide into the chat and tell Claude “set up my brand from this”.</span>
          </button>
        </div>
      </main>
      </div>
    );
  }

  if (mode === "build") {
    return (
      <BrandBuilder
        brand={brand}
        onBack={() => setMode(brand.setUp ? "kit" : "start")}
        onAuthError={onAuthError}
        onDone={(next, generated) => {
          // A freshly built brand becomes the default look right away.
          if (generated) setBrand(next);
          else save({ ...next, defaultStyle: styleFromBrand(next, next.defaultStyle) });
          api.listAssets().then(setAssets, onAuthError);
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
    <div className="site">
    <TopNav active="brand" />
    <main className="kit">
      <aside className="kit-nav">
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
        <button className="chip" onClick={() => setMode("build")}>✨ Rebuild from inspiration</button>
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

        <section id="kit-inspo" className="panel-card">
          <h2>Inspiration</h2>
          {brand.story ? <p className="kit-story">{brand.story}</p> : null}
          {brand.inspiration.length ? (
            <div className="moodboard">
              {assets
                .filter((a) => brand.inspiration.includes(a.id))
                .map((a) => (
                  <img key={a.id} src={libraryUrl(a.file)} alt="" />
                ))}
            </div>
          ) : (
            <p className="muted small">No inspiration board yet. Tap “Rebuild from inspiration” to build your brand from images you love.</p>
          )}
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
          <ListField label="Your vibe in a few words" placeholder="e.g. grounded, warm, quietly confident" items={brand.voice.tone} onChange={(tone) => save({ ...brand, voice: { ...brand.voice, tone } })} />
          <ListField label="Phrases you say a lot" placeholder="e.g. let's get you some time back" items={brand.voice.phrases} onChange={(phrases) => save({ ...brand, voice: { ...brand.voice, phrases } })} />
          <ListField label="Words to never use" placeholder="e.g. hustle, boss babe" items={brand.voice.avoid} onChange={(avoid) => save({ ...brand, voice: { ...brand.voice, avoid } })} />
        </section>

        <div id="kit-business">
          <BusinessCard brand={brand} onBrand={save} />
        </div>
      </div>
    </main>
    </div>
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

const VIBE_CHIPS = ["calm", "bold", "playful", "minimalist", "luxe", "warm", "earthy", "editorial", "feminine", "edgy", "modern", "cozy"];

// Like working with a brand designer: share an inspiration board, answer a few questions, and get
// a whole brand built from it.
function BrandBuilder({ brand, onBack, onDone, onAuthError }: { brand: Brand; onBack: () => void; onDone: (b: Brand, generated: boolean) => void; onAuthError: (err: unknown) => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [board, setBoard] = useState<Asset[]>([]);
  const [answers, setAnswers] = useState({
    name: brand.name === "My Brand" ? "" : brand.name,
    what: brand.business.what,
    audience: brand.business.audience,
    vibe: "",
    chips: [] as string[],
  });
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<number | null>(null);

  useEffect(() => {
    api.listAssets().then((all) => setBoard(all.filter((a) => brand.inspiration.includes(a.id))), onAuthError);
  }, [brand.inspiration, onAuthError]);

  const addImages = async (files: FileList | null) => {
    for (const file of Array.from(files ?? []).slice(0, 12 - board.length)) {
      setUploading(0);
      try {
        const a = await api.uploadAsset(file, setUploading, "inspo");
        setBoard((b) => [...b, a]);
      } catch (err) {
        onAuthError(err);
      }
    }
    setUploading(null);
  };

  const create = async () => {
    setStep(3);
    const vibe = [answers.vibe, ...answers.chips].filter(Boolean).join(", ");
    const inspirationIds = board.map((a) => a.id);
    setStatus("Studying your board…");
    try {
      const made = await api.generateBrand({ name: answers.name, what: answers.what, audience: answers.audience, vibe, inspirationIds });
      onDone(made, true);
      return;
    } catch (err) {
      onAuthError(err);
    }
    // No Claude available: build it here from the board's colors and the vibe.
    setStatus("Pulling colors from your images…");
    const palette = await paletteFromImages(board.map((a) => libraryUrl(a.file)));
    const vibeId = VIBES.find((v) => [answers.vibe, ...answers.chips].join(" ").toLowerCase().includes(v.id))?.id ?? "calm";
    const built = buildBrand({ name: answers.name, what: answers.what, audience: answers.audience, vibes: [vibeId], color: palette[0]?.hex ?? "#7C4DFF" }, brand);
    onDone({ ...built, palette: palette.length >= 3 ? palette : built.palette, inspiration: inspirationIds }, false);
  };

  return (
    <div className="site">
      <TopNav active="brand" />
      <main className="page stack wide">
        <button className="link" onClick={onBack}>‹ Back</button>
        <span className="eyebrow">Step {step} of 3</span>
        {step === 1 ? (
          <>
            <h1 className="display small">Show us what you love.</h1>
            <p className="lede">Like a brand designer would ask: share 4 to 12 images that feel like the brand you want. Pinterest saves, other brands, colors, textures, places, outfits. We'll read the mood.</p>
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (void addImages(e.target.files), (e.target.value = ""))} />
            <div className="moodboard edit">
              {board.map((a) => (
                <div key={a.id} className="mood-item">
                  <img src={libraryUrl(a.file)} alt="" />
                  <button className="asset-delete" aria-label="Remove" onClick={() => setBoard(board.filter((x) => x.id !== a.id))}>×</button>
                </div>
              ))}
              {board.length < 12 ? (
                <button className="mood-add" onClick={() => input.current?.click()} disabled={uploading !== null}>
                  <span className="add-plus">＋</span>
                  {uploading === null ? "Add images" : `Uploading ${Math.round(uploading * 100)}%`}
                </button>
              ) : null}
            </div>
            <div className="row">
              <button className="btn primary" disabled={board.length < 3} onClick={() => setStep(2)}>
                Next: about you ›
              </button>
              <span className="muted small">{board.length < 3 ? `Add at least ${3 - board.length} more` : `${board.length} images`}</span>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h1 className="display small">Tell us about you.</h1>
            <section className="panel-card">
              <Label>Your business name</Label>
              <input value={answers.name} placeholder="Leave blank and we'll suggest one" onChange={(e) => setAnswers({ ...answers, name: e.target.value })} />
              <Label>What you do</Label>
              <input value={answers.what} placeholder="e.g. I'm a VA who manages inboxes and calendars" onChange={(e) => setAnswers({ ...answers, what: e.target.value })} />
              <Label>Who you help</Label>
              <input value={answers.audience} placeholder="e.g. busy coaches and course creators" onChange={(e) => setAnswers({ ...answers, audience: e.target.value })} />
              <Label>How should your brand feel?</Label>
              <textarea rows={2} value={answers.vibe} placeholder="In your own words, e.g. calm but confident, like a deep breath, not corporate" onChange={(e) => setAnswers({ ...answers, vibe: e.target.value })} />
              <div className="options">
                {VIBE_CHIPS.map((c) => {
                  const on = answers.chips.includes(c);
                  return (
                    <button key={c} className={`option ${on ? "on" : ""}`} onClick={() => setAnswers({ ...answers, chips: on ? answers.chips.filter((x) => x !== c) : [...answers.chips, c] })}>
                      <span className="option-label">{c}</span>
                    </button>
                  );
                })}
              </div>
            </section>
            <div className="row">
              <button className="btn" onClick={() => setStep(1)}>‹ Back</button>
              <button className="btn primary" onClick={create}>✨ Create my brand</button>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <div className="generating">
            <div className="moodboard small">
              {board.slice(0, 6).map((a) => (
                <img key={a.id} src={libraryUrl(a.file)} alt="" />
              ))}
            </div>
            <div className="spinner" />
            <h2 className="display small">{status}</h2>
            <p className="muted">Choosing your palette, fonts and voice. This can take a minute or two.</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
