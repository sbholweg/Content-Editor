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

  // How much silence was trimmed between two kept words (shown as a small marker in the text).
  const speed = timeline.speed || 1;
  const trimmedBetween = (a: (typeof words)[number], b: (typeof words)[number]) => {
    const oa = outputTimes.get(a.id);
    const ob = outputTimes.get(b.id);
    if (!oa || !ob) return 0;
    return b.startMs - a.endMs - (ob.startMs - oa.endMs) * speed;
  };
  let pausesTrimmed = 0;
  let prev: (typeof words)[number] | undefined;
  let cutBetween = false;
  for (const w of words) {
    if (w.cut) {
      cutBetween = true;
      continue;
    }
    if (prev && !cutBetween && trimmedBetween(prev, w) >= 250) pausesTrimmed++;
    prev = w;
    cutBetween = false;
  }
  const wordsCut = words.filter((w) => w.cut).length;
  const umsCut = words.filter((w) => w.cut && isFiller(w.text)).length;

  const row = (line: (typeof lines)[number]) => {
    const firstKept = line.words.find((w) => !w.cut);
    const out = firstKept ? outputTimes.get(firstKept.id) : undefined;
    const playing = line.words.some((w) => {
      const o = outputTimes.get(w.id);
      return o && timeMs >= o.startMs && timeMs < o.endMs;
    });
    const lineCut = isLineCut(line);
    let prevKept: (typeof words)[number] | undefined;
    let cutSincePrev = false;
    return (
      <div key={line.id} className={`line ${playing ? "playing" : ""} ${lineCut ? "is-cut" : ""}`}>
        <button className="line-time mono" onClick={() => firstKept && seekToWord(firstKept.id)} title="Play from here">
          {out ? formatTime(out.startMs) : "cut"}
        </button>
        <p className="line-words">
          {line.words.map((w) => {
            let chip: React.ReactNode = null;
            if (!w.cut) {
              const trimmed = prevKept && !cutSincePrev ? trimmedBetween(prevKept, w) : 0;
              if (trimmed >= 250) chip = <span className="pause-chip" title="Pause trimmed">⏸ {(trimmed / 1000).toFixed(1)}s</span>;
              prevKept = w;
              cutSincePrev = false;
            } else cutSincePrev = true;
            return (
              <React.Fragment key={w.id}>
                {chip}
                {chip ? " " : null}
                <span role="button" tabIndex={0} className={`lw ${w.cut ? "cut" : ""}`} onClick={() => toggleWord(w.id)}>
                  {w.text}
                </span>{" "}
              </React.Fragment>
            );
          })}
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
      </header>
      <p className="cut-stats mono">
        reel {formatTime(timeline.durationMs)} · {wordsCut} word{wordsCut === 1 ? "" : "s"} cut · {umsCut} um{umsCut === 1 ? "" : "s"} cut · {pausesTrimmed} pause{pausesTrimmed === 1 ? "" : "s"} trimmed{speed !== 1 ? ` · ${speed}× speed` : ""}
      </p>

      <div className="tighten">
        <div className="grow">
          <strong>Make it flow</strong>
          <p className="muted small">Claude reads your take like an editor and cuts every pause, flub, restart, repeat and um, so it plays like one clean take. Tap any word to bring it back.</p>
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
          {busy ? "Reading your take… (up to a minute)" : "✨ Tighten it"}
        </button>
      </div>

      <div className="row speed-row">
        <span className="small grow"><strong>Talking speed</strong> <span className="muted">· 1.2× keeps it snappy without sounding chipmunky</span></span>
        {[1, 1.1, 1.2, 1.25].map((v) => (
          <button
            key={v}
            className={`chip ${(reel.style.speed || 1) === v ? "accent" : ""}`}
            onClick={() => update({ style: { ...reel.style, speed: v } })}
            aria-pressed={(reel.style.speed || 1) === v}
          >
            {v}×
          </button>
        ))}
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
