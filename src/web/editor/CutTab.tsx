import React, { useState } from "react";
import { isLineCut } from "../../shared/lines";
import { isFiller } from "../../shared/words";
import type { Project } from "../../shared/types";
import { api } from "../api";
import { formatTime, useEditor } from "./context";

export function CutTab({ onTightened }: { onTightened: (p: Project) => void }) {
  const { project, reel, update, lines, outputTimes, timeMs, timeline, seekToWord, onAuthError } = useEditor();
  const [showCut, setShowCut] = useState(false);
  const [busy, setBusy] = useState(false);
  const words = reel.words;
  const fillers = words.filter((w) => isFiller(w.text) && !w.cut).length;
  const anyCut = words.some((w) => w.cut);
  const kept = lines.filter((l) => !isLineCut(l));
  const cut = lines.filter(isLineCut);

  const setCut = (ids: Set<string>, value: boolean) => update({ words: words.map((w) => (ids.has(w.id) ? { ...w, cut: value } : w)) });
  const toggleWord = (id: string) => update({ words: words.map((w) => (w.id === id ? { ...w, cut: !w.cut } : w)) });

  const row = (line: (typeof lines)[number]) => {
    const firstKept = line.words.find((w) => !w.cut);
    const out = firstKept ? outputTimes.get(firstKept.id) : undefined;
    const playing = line.words.some((w) => {
      const o = outputTimes.get(w.id);
      return o && timeMs >= o.startMs && timeMs < o.endMs;
    });
    const lineCut = isLineCut(line);
    return (
      <div key={line.id} className={`line ${playing ? "playing" : ""} ${lineCut ? "is-cut" : ""}`}>
        <button className="line-num" onClick={() => firstKept && seekToWord(firstKept.id)} title="Play from here">
          <span>{String(line.number).padStart(2, "0")}</span>
          <small>{out ? formatTime(out.startMs) : "cut"}</small>
        </button>
        <p className="line-words">
          {line.words.map((w) => (
            <React.Fragment key={w.id}>
              <span role="button" tabIndex={0} className={`lw ${w.cut ? "cut" : ""}`} onClick={() => toggleWord(w.id)}>
                {w.text}
              </span>{" "}
            </React.Fragment>
          ))}
        </p>
        <button className="chip line-action" onClick={() => setCut(new Set(line.words.map((w) => w.id)), !lineCut)}>
          {lineCut ? "Bring back" : "✂ Cut line"}
        </button>
      </div>
    );
  };

  return (
    <section className="panel-card">
      <header className="panel-head">
        <div>
          <h2>Your cut</h2>
          <p className="muted small">Tap a word to cut it. Tap again to bring it back.</p>
        </div>
        <span className="mono muted">{formatTime(timeline.durationMs)} long</span>
      </header>

      <div className="tighten">
        <div className="grow">
          <strong>Make it flow</strong>
          <p className="muted small">Cuts every pause, um, repeat and restarted sentence so it plays like a tight reel. Undo anytime.</p>
        </div>
        <button
          className="btn primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const p = await api.tighten(project.id);
              update({ words: p.words, removePauses: true });
              onTightened(p);
            } catch (err) {
              onAuthError(err);
            }
            setBusy(false);
          }}
        >
          {busy ? "Tightening…" : "✨ Tighten it"}
        </button>
      </div>

      <div className="row">
        <button className={`chip ${reel.removePauses ? "accent" : ""}`} onClick={() => update({ removePauses: !reel.removePauses })}>
          {reel.removePauses ? "✓ Pauses removed" : "Remove pauses"}
        </button>
        <button
          className="chip"
          disabled={fillers === 0}
          onClick={() => update({ words: words.map((w) => (isFiller(w.text) ? { ...w, cut: true } : w)) })}
        >
          {fillers ? `Cut ${fillers} um${fillers === 1 ? "" : "s"} & uhs` : "No ums left"}
        </button>
        {anyCut ? (
          <button className="chip" onClick={() => update({ words: words.map((w) => ({ ...w, cut: false })) })}>
            Undo all cuts
          </button>
        ) : null}
      </div>

      {words.length === 0 ? <p className="muted">No speech was found in this video.</p> : null}
      <div className="lines">{kept.map(row)}</div>

      {cut.length ? (
        <div className="cut-lines">
          <button className="cut-toggle mono" onClick={() => setShowCut(!showCut)}>
            {showCut ? "⌄" : "›"} {cut.length} line{cut.length === 1 ? "" : "s"} cut
          </button>
          {showCut ? <div className="lines">{cut.map(row)}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
