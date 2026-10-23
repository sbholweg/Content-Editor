import React, { useState } from "react";
import { isLineCut, type Line } from "../../shared/lines";
import type { Overlay, ReelProps } from "../../shared/types";
import { api } from "../api";
import { LibraryBrowser, Modal, OverlayAdjust, Thumb } from "../Media";
import { formatTime, useEditor } from "./context";
import { LookGallery } from "./LookGallery";
import { GraphicsCards } from "./GraphicsCards";
import { CaptionsPanel, ColorPanel, FontsPanel, HookPanel } from "./panels";

type Section = "captions" | "hook" | "fonts" | "color";

const EMOJIS = ["🔥", "💰", "✨", "💡", "🚀", "💜", "😂", "👀", "✅", "❌", "⏰", "📈", "🙌", "💸", "🎯"];
const LAYOUT_LABEL = { headline: "Headline", eyebrow: "Eyebrow + headline", subhead: "Headline + subhead" };
const PLACEMENT_LABEL = { top: "top", middle: "middle", bottom: "lower", full: "full screen" };

export function VisualsTab({ previewProps }: { previewProps: ReelProps }) {
  const [view, setView] = useState<"style" | "lines">("style");
  return (
    <>
      <section className="panel-card">
        <header className="panel-head">
          <div>
            <h2>Your visuals</h2>
            <p className="muted small">
              {view === "style" ? "Pick a look, then fine-tune captions, hook, fonts and colors." : "Line by line: key words, emojis, and GIFs, images or b-roll on any line."}
            </p>
          </div>
        </header>
        <div className="segmented big">
          <button className={view === "style" ? "on" : ""} onClick={() => setView("style")}>Style</button>
          <button className={view === "lines" ? "on" : ""} onClick={() => setView("lines")}>Lines & media</button>
        </div>
      </section>
      <GraphicsCards />
      {view === "style" ? <StyleView previewProps={previewProps} /> : <LinesView />}
    </>
  );
}

function StyleView({ previewProps }: { previewProps: ReelProps }) {
  const [open, setOpen] = useState<Section | null>(null);
  const sections: { id: Section; title: string; hint: string; body: React.ReactNode }[] = [
    { id: "captions", title: "Captions", hint: "style, placement, size, zoom jumps", body: <CaptionsPanel /> },
    { id: "hook", title: "Hook", hint: "the title, its style and position", body: <HookPanel previewProps={previewProps} /> },
    { id: "fonts", title: "Fonts & colors", hint: "your fonts, upload your own, colors", body: <FontsPanel /> },
    { id: "color", title: "Color grading", hint: "auto-fix the light, or a look · before & after", body: <ColorPanel previewProps={previewProps} /> },
  ];
  return (
    <>
      <section className="panel-card">
        <h3>Looks</h3>
        <LookGallery previewProps={previewProps} />
      </section>
      <section className="panel-card accordion">
        {sections.map((sec) => (
          <div key={sec.id} className={`acc ${open === sec.id ? "open" : ""}`}>
            <button className="acc-head" onClick={() => setOpen(open === sec.id ? null : sec.id)}>
              <span className="grow left">
                <strong>{sec.title}</strong>
                <span className="muted small">{sec.hint}</span>
              </span>
              <span className="acc-caret">{open === sec.id ? "–" : "+"}</span>
            </button>
            {open === sec.id ? <div className="acc-body">{sec.body}</div> : null}
          </div>
        ))}
      </section>
    </>
  );
}

function LinesView() {
  const { project, update, lines, assets, setAssets, onAuthError, notify } = useEditor();
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState(false);
  const kept = lines.filter((l) => !isLineCut(l));
  return (
    <section className="panel-card">
      <div className="row">
        <button
          className="chip accent"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            notify("Picking key words… this can take up to a minute.");
            try {
              const [p, ai] = await Promise.all([api.autoHighlight(project.id), api.aiStatus()]);
              update({ words: p.words, hookText: p.hookText });
              const n = p.words.filter((w) => w.highlight && !w.cut).length;
              notify(
                ai.source === "rules"
                  ? `Picked ${n} key words with simple rules. For smarter picks, ask Claude in chat: “pick my key words”.`
                  : `Claude picked ${n} key words and a hook. Tap any word to change it.`,
              );
            } catch (err) {
              onAuthError(err);
            }
            setBusy(false);
          }}
        >
          {busy ? "Picking…" : "✨ Pick key words for me"}
        </button>
        <button className="chip" onClick={() => setLibrary(true)}>▦ Your library</button>
        <span className="muted small grow">Tap a word to make it a key word.</span>
      </div>
      <div className="lines">
        {kept.map((line, i) => (
          <VisualLine key={line.id} line={line} first={i === 0} />
        ))}
      </div>
      {library ? (
        <Modal eyebrow="Your library" title="GIFs, images & b-roll" subtitle="Add them once, use them on any reel." onClose={() => setLibrary(false)}>
          <LibraryBrowser assets={assets} onAssets={setAssets} onAuthError={onAuthError} />
        </Modal>
      ) : null}
    </section>
  );
}

function VisualLine({ line, first }: { line: Line; first: boolean }) {
  const { reel, update, outputTimes, timeMs, seekToWord, assets, openPicker } = useEditor();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const keptWords = line.words.filter((w) => !w.cut);
  const start = outputTimes.get(keptWords[0].id);
  const playing = keptWords.some((w) => {
    const o = outputTimes.get(w.id);
    return o && timeMs >= o.startMs && timeMs < o.endMs;
  });
  const ids = new Set(line.words.map((w) => w.id));
  const overlays = reel.overlays.filter((o) => ids.has(o.startWordId));
  const word = reel.words.find((w) => w.id === selected);
  const index = new Map(reel.words.map((w, i) => [w.id, i]));

  const setWord = (id: string, patch: Partial<(typeof reel.words)[number]>) =>
    update({ words: reel.words.map((w) => (w.id === id ? { ...w, ...patch } : w)) });
  const setOverlay = (id: string, patch: Partial<Overlay>) => update({ overlays: reel.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const shift = (o: Overlay, edge: "start" | "end", by: number) => {
    const s = index.get(o.startWordId) ?? 0;
    const e = index.get(o.endWordId) ?? s;
    const next = Math.min(reel.words.length - 1, Math.max(0, (edge === "start" ? s : e) + by));
    if (edge === "start" && next <= e) setOverlay(o.id, { startWordId: reel.words[next].id });
    if (edge === "end" && next >= s) setOverlay(o.id, { endWordId: reel.words[next].id });
  };

  return (
    <div className={`line visual ${playing ? "playing" : ""}`}>
      <button className="line-num" onClick={() => seekToWord(keptWords[0].id)} title="Play from here">
        <span>{String(line.number).padStart(2, "0")}</span>
        <small>{start ? formatTime(start.startMs) : ""}</small>
      </button>

      <div className="line-main">
        <p className="line-words">
          {keptWords.map((w) => (
            <React.Fragment key={w.id}>
              <span
                role="button"
                tabIndex={0}
                className={`lw ${w.highlight ? "key" : ""} ${selected === w.id ? "sel" : ""}`}
                onClick={() => (editing ? setSelected(w.id) : setWord(w.id, { highlight: !w.highlight }))}
              >
                {w.emoji ? `${w.emoji} ` : ""}
                {w.text}
              </span>{" "}
            </React.Fragment>
          ))}
          <button className="icon-btn small" title="Fix a word or add an emoji" onClick={() => (setEditing(!editing), setSelected(null))}>
            {editing ? "Done" : "✎"}
          </button>
        </p>

        {editing ? (
          word ? (
            <div className="word-editor">
              <input value={word.text} onChange={(e) => setWord(word.id, { text: e.target.value })} />
              <div className="emojis">
                {EMOJIS.map((e) => (
                  <button key={e} className={word.emoji === e ? "on" : ""} onClick={() => setWord(word.id, { emoji: word.emoji === e ? undefined : e })}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="muted small">Tap a word above to fix its spelling or add an emoji.</p>
          )
        ) : null}

        <div className="line-items">
          {first && reel.hookText ? (
            <div className="item">
              <span className="item-icon">H</span>
              <span className="grow left">
                <strong>Hook · {LAYOUT_LABEL[reel.style.hookLayout]}</strong>
                <span className="muted small">“{reel.hookText}”</span>
              </span>
              <span className="muted small">change it in Style › Hook</span>
            </div>
          ) : null}
          {overlays.map((o) => {
            const a = assets.find((x) => x.id === o.assetId);
            if (o.graphic) {
              return (
                <div key={o.id} className="item">
                  <span className="item-icon">✦</span>
                  <span className="grow left">
                    <strong>Graphic: “{o.graphic.text}”{o.suggested ? " · suggested" : ""}</strong>
                    <span className="muted small">change it in Graphics above</span>
                  </span>
                </div>
              );
            }
            return (
              <div key={o.id} className="item-wrap">
                <div className="item">
                  {a ? <Thumb asset={a} /> : <span className="thumb" />}
                  <span className="grow left">
                    <strong>{a ? `${a.kind === "gif" ? "GIF" : a.kind === "video" ? "B-roll" : "Image"}: ${a.name}` : "Missing from library"}</strong>
                    <span className="muted small">{PLACEMENT_LABEL[o.placement]}</span>
                  </span>
                  <button className="chip" onClick={() => openPicker({ kind: "overlay-swap", overlayId: o.id })}>⇄ Swap</button>
                  <button className="chip" onClick={() => setAdjusting(adjusting === o.id ? null : o.id)} aria-label="Adjust">
                    {adjusting === o.id ? "Done" : "⋯"}
                  </button>
                </div>
                {adjusting === o.id ? (
                  <OverlayAdjust
                    overlay={o}
                    onChange={(patch) => setOverlay(o.id, patch)}
                    onShift={(edge, by) => shift(o, edge, by)}
                    onRemove={() => update({ overlays: reel.overlays.filter((x) => x.id !== o.id) })}
                  />
                ) : null}
              </div>
            );
          })}
          <button
            className="add-look"
            onClick={() => openPicker({ kind: "overlay-add", fromWordId: keptWords[0].id, toWordId: keptWords[keptWords.length - 1].id })}
          >
            ＋ Add image, GIF or b-roll
          </button>
        </div>
      </div>
    </div>
  );
}
