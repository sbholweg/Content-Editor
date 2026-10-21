import React, { useState } from "react";
import { isLineCut, type Line } from "../../shared/lines";
import type { Overlay, ReelProps } from "../../shared/types";
import { api } from "../api";
import { OverlayAdjust, Thumb } from "../Media";
import { formatTime, useEditor } from "./context";
import { CaptionsPanel, FontsPanel, HookPanel, LibraryPanel, LooksPanel } from "./panels";

type PanelId = "captions" | "hook" | "fonts" | "library" | "looks";

const EMOJIS = ["🔥", "💰", "✨", "💡", "🚀", "💜", "😂", "👀", "✅", "❌", "⏰", "📈", "🙌", "💸", "🎯"];
const LAYOUT_LABEL = { headline: "Headline", eyebrow: "Eyebrow + headline", subhead: "Headline + subhead" };
const PLACEMENT_LABEL = { top: "top", middle: "middle", bottom: "lower", full: "full screen" };

export function VisualsTab({ previewProps }: { previewProps: ReelProps }) {
  const { project, reel, update, lines, assets, onAuthError } = useEditor();
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [busy, setBusy] = useState(false);
  const kept = lines.filter((l) => !isLineCut(l));
  const looks = (reel.hookText ? 1 : 0) + reel.overlays.length;

  const tools: { id: PanelId; label: string; title: string }[] = [
    { id: "captions", label: `Captions: ${reel.style.captionMode === "single" ? "Single word" : "Phrase"}`, title: "Captions" },
    { id: "hook", label: "Hook", title: "Hook" },
    { id: "fonts", label: "Fonts & colours", title: "Fonts & colours" },
    { id: "library", label: "Library", title: "Your library" },
    { id: "looks", label: "Looks", title: "Your looks" },
  ];

  return (
    <>
      <section className="panel-card">
        <header className="panel-head">
          <div>
            <h2>Your visuals</h2>
            <p className="muted small">Every look on your reel, line by line. Tap a word to make it a key word. Swap any look, or add one to a line.</p>
          </div>
          <span className="mono muted">{looks} looks</span>
        </header>
        <div className="toolbar">
          {tools.map((t) => (
            <button key={t.id} className={`tool ${panel === t.id ? "on" : ""}`} onClick={() => setPanel(panel === t.id ? null : t.id)}>
              {t.label}
            </button>
          ))}
          <button
            className={`tool ${reel.style.zoomJumps ? "on" : ""}`}
            onClick={() => update({ style: { ...reel.style, zoomJumps: !reel.style.zoomJumps } })}
            title="Punch in and out between lines"
          >
            {reel.style.zoomJumps ? "✓ Zoom jumps" : "Zoom jumps"}
          </button>
          <button
            className="tool"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const p = await api.autoHighlight(project.id);
                update({ words: p.words, hookText: p.hookText });
              } catch (err) {
                onAuthError(err);
              }
              setBusy(false);
            }}
          >
            {busy ? "Picking…" : "✨ Pick key words for me"}
          </button>
        </div>
      </section>

      {panel ? (
        <section className="panel-card open-panel">
          <header className="panel-head">
            <h3>{tools.find((t) => t.id === panel)?.title}</h3>
            <button className="icon-btn" onClick={() => setPanel(null)} aria-label="Close">✕</button>
          </header>
          {panel === "captions" ? <CaptionsPanel /> : null}
          {panel === "hook" ? <HookPanel previewProps={previewProps} /> : null}
          {panel === "fonts" ? <FontsPanel /> : null}
          {panel === "library" ? <LibraryPanel /> : null}
          {panel === "looks" ? <LooksPanel /> : null}
        </section>
      ) : null}

      <section className="panel-card">
        <div className="lines">
          {kept.map((line, i) => (
            <VisualLine key={line.id} line={line} first={i === 0} onOpenHook={() => setPanel("hook")} />
          ))}
        </div>
        {assets.length === 0 ? (
          <p className="muted small">Tip: add your favourite GIFs, graphics and b-roll to the ▦ Library once, then use them on any reel.</p>
        ) : null}
      </section>
    </>
  );
}

function VisualLine({ line, first, onOpenHook }: { line: Line; first: boolean; onOpenHook: () => void }) {
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
              <button className="chip" onClick={onOpenHook}>⇄ Swap</button>
            </div>
          ) : null}
          {overlays.map((o) => {
            const a = assets.find((x) => x.id === o.assetId);
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
