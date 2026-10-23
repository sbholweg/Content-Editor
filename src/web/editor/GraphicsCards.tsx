import React, { useState } from "react";
import type { Overlay, ReelGraphic } from "../../shared/types";
import { api, libraryUrl } from "../api";
import { GiphySearch } from "../Giphy";
import { Options } from "../ui";
import { formatTime, useEditor } from "./context";

const KIND_LABEL: Record<ReelGraphic["kind"], string> = { sticker: "Sticker", stat: "Counting number", cta: "Comment bubble" };

// Claude suggests graphics; each one is a card you Keep, Change or Drop. Suggestions already show
// in the preview, so you can judge them in place.
export function GraphicsCards() {
  const { project, reel, update, assets, setAssets, outputTimes, seekToWord, notify, onAuthError } = useEditor();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const index = new Map(reel.words.map((w, i) => [w.id, i]));
  const items = reel.overlays
    .filter((o) => o.graphic || o.suggested || o.gifQuery)
    .sort((a, b) => (index.get(a.startWordId) ?? 0) - (index.get(b.startWordId) ?? 0));
  const pending = items.filter((o) => o.suggested).length;

  const set = (id: string, patch: Partial<Overlay>) => update({ overlays: reel.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const drop = (id: string) => update({ overlays: reel.overlays.filter((o) => o.id !== id) });
  const shift = (o: Overlay, edge: "start" | "end", by: number) => {
    const s = index.get(o.startWordId) ?? 0;
    const e = index.get(o.endWordId) ?? s;
    const next = Math.min(reel.words.length - 1, Math.max(0, (edge === "start" ? s : e) + by));
    if (edge === "start" && next <= e) set(o.id, { startWordId: reel.words[next].id });
    if (edge === "end" && next >= s) set(o.id, { endWordId: reel.words[next].id });
  };

  const suggest = async () => {
    setBusy(true);
    try {
      const p = await api.suggestGraphics(project.id);
      update({ overlays: p.overlays });
      notify(
        p.suggestedCount
          ? `${p.suggestedCount} graphic${p.suggestedCount === 1 ? "" : "s"} suggested${p.suggestedBy === "claude" ? " by Claude" : ""}. Play the reel to see them, then keep, change or drop each one.`
          : "Nothing stood out for a graphic in this one. Try again after more editing, or add one yourself.",
      );
    } catch (err) {
      onAuthError(err);
      notify((err as Error).message);
    }
    setBusy(false);
  };

  return (
    <section className="panel-card">
      <header className="panel-head">
        <div>
          <h3>Graphics</h3>
          <p className="muted small">Claude suggests stickers, counting numbers, comment bubbles and GIFs from your library. Keep, change or drop each one.</p>
        </div>
        <button className="btn primary small-btn" disabled={busy} onClick={suggest}>
          {busy ? "Watching your reel…" : items.length ? "✨ Suggest again" : "✨ Suggest graphics"}
        </button>
      </header>
      {pending > 1 ? (
        <div className="row">
          <span className="muted small grow">{pending} suggestions waiting</span>
          <button className="chip" onClick={() => update({ overlays: reel.overlays.map((o) => (o.suggested ? { ...o, suggested: false } : o)) })}>Keep all</button>
          <button className="chip" onClick={() => update({ overlays: reel.overlays.filter((o) => !o.suggested) })}>Drop all</button>
        </div>
      ) : null}
      {items.length ? (
        <div className="gfx-cards">
          {items.map((o) => {
            const at = outputTimes.get(o.startWordId);
            const words = reel.words.slice(index.get(o.startWordId), (index.get(o.endWordId) ?? 0) + 1).filter((w) => !w.cut).map((w) => w.text).join(" ");
            const asset = o.graphic ? undefined : assets.find((a) => a.id === o.assetId);
            return (
              <div key={o.id} className={`gfx-card ${o.suggested ? "suggested" : ""}`}>
                <div className="gfx-preview">
                  {o.graphic ? <MiniGraphic graphic={o.graphic} /> : asset ? <img src={libraryUrl(asset.thumb ?? asset.file)} alt="" /> : <span className="mini-gif">GIF<small>“{o.gifQuery}”</small></span>}
                </div>
                <div className="gfx-body">
                  <div className="row">
                    <strong className="grow">
                      {o.graphic ? KIND_LABEL[o.graphic.kind] : asset ? `${asset.kind === "gif" ? "GIF" : "Image"}: ${asset.name}` : o.gifQuery ? "GIF from GIPHY: pick one" : "Missing from library"}
                    </strong>
                    {o.suggested ? <span className="tag-suggested">Suggested</span> : <span className="muted small">Kept ✓</span>}
                  </div>
                  <button className="link gfx-when" onClick={() => seekToWord(o.startWordId)}>
                    <span className="mono">{at ? formatTime(at.startMs) : "cut"}</span> · on “{words.length > 60 ? `${words.slice(0, 60)}…` : words}”
                  </button>
                  {o.why ? <p className="muted small">{o.why}</p> : null}
                  {o.gifQuery && !asset ? (
                    <GiphySearch
                      compact
                      initialQuery={o.gifQuery}
                      onAuthError={onAuthError}
                      onPicked={(a) => {
                        setAssets([a, ...assets]);
                        set(o.id, { assetId: a.id, gifQuery: undefined, suggested: false });
                      }}
                    />
                  ) : null}
                  <div className="row">
                    {o.suggested && !o.gifQuery ? <button className="chip accent" onClick={() => set(o.id, { suggested: false })}>Keep</button> : null}
                    <button className="chip" onClick={() => setEditing(editing === o.id ? null : o.id)}>{editing === o.id ? "Done" : "Change"}</button>
                    <button className="chip" onClick={() => drop(o.id)}>{o.suggested ? "Drop" : "Remove"}</button>
                  </div>
                  {editing === o.id ? (
                    <div className="adjust">
                      {o.graphic ? (
                        <>
                          <Options
                            value={o.graphic.kind}
                            onChange={(kind) => set(o.id, { graphic: { ...o.graphic!, kind } })}
                            options={(["sticker", "stat", "cta"] as const).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
                          />
                          <input value={o.graphic.text} maxLength={40} aria-label="Text" onChange={(e) => set(o.id, { graphic: { ...o.graphic!, text: e.target.value } })} />
                          {o.graphic.kind !== "sticker" ? (
                            <input
                              value={o.graphic.sub ?? ""}
                              maxLength={40}
                              placeholder={o.graphic.kind === "stat" ? "Small label under the number (optional)" : "Comment"}
                              aria-label="Small label"
                              onChange={(e) => set(o.id, { graphic: { ...o.graphic!, sub: e.target.value } })}
                            />
                          ) : null}
                        </>
                      ) : null}
                      <div className="row">
                        <span className="small grow">Starts</span>
                        <button className="chip" onClick={() => shift(o, "start", -1)}>A word earlier</button>
                        <button className="chip" onClick={() => shift(o, "start", 1)}>A word later</button>
                      </div>
                      <div className="row">
                        <span className="small grow">Ends</span>
                        <button className="chip" onClick={() => shift(o, "end", -1)}>A word earlier</button>
                        <button className="chip" onClick={() => shift(o, "end", 1)}>A word later</button>
                      </div>
                      <p className="muted small">To move it on screen, tap “✥ Move” above the preview while it's showing.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

// A small stand-in for each graphic on its card.
function MiniGraphic({ graphic }: { graphic: ReelGraphic }) {
  if (graphic.kind === "sticker") return <span className="mini-sticker">{graphic.text}</span>;
  if (graphic.kind === "stat")
    return (
      <span className="mini-stat">
        <b>{graphic.text}</b>
        {graphic.sub ? <small>{graphic.sub}</small> : null}
      </span>
    );
  return (
    <span className="mini-cta">
      <small>{graphic.sub || "Comment"}</small>
      <b>{graphic.text}</b>
    </span>
  );
}
