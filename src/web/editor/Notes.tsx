import React, { useState } from "react";
import { api } from "../api";
import { formatTime, useEditor } from "./context";

const EXAMPLES = ["Make the captions bigger", "Move the hook lower", "Cut the first sentence", "Make it feel softer"];

// "Tell Claude": say a change in plain words and Claude makes it, so nobody has to learn where
// every setting lives. If Claude isn't connected, the request is kept as a note for later.
export function AskClaude() {
  const { project, reel, update, timeMs, timeline, seekMs, takeClaudeChange, onAuthError } = useEditor();
  const [text, setText] = useState("");
  const [here, setHere] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const notes = [...(reel.notes ?? [])].sort((a, b) => a.atMs - b.atMs);

  const atMoment = () => {
    const word = timeline.words.find((w) => timeMs < w.endMs) ?? timeline.words.at(-1);
    const index = word ? reel.words.findIndex((w) => w.id === word.id) : -1;
    return `At ${formatTime(timeMs)} of the finished reel${index >= 0 ? ` (around word [${index}] "${reel.words[index].text}")` : ""}: `;
  };

  const send = async () => {
    const request = text.trim();
    if (!request || busy) return;
    setBusy(true);
    setResult(null);
    const before = reel;
    try {
      const { project: p, summary } = await api.ask(project.id, `${here ? atMoment() : ""}${request}`);
      takeClaudeChange(before, p);
      setResult({ ok: true, message: summary });
      setText("");
    } catch (err) {
      onAuthError(err);
      setResult({ ok: false, message: (err as Error).message });
    }
    setBusy(false);
  };

  const saveAsNote = () => {
    update({ notes: [...(reel.notes ?? []), { id: `note-${Date.now()}`, atMs: Math.round(timeMs), text: text.trim() }] });
    setText("");
    setResult(null);
  };

  return (
    <section className="ask-box">
      <div className="ask-head">
        <strong>✨ Tell Claude</strong>
        <span className="muted small">Say what to change, in your own words.</span>
      </div>
      <textarea
        rows={2}
        value={text}
        placeholder="e.g. make the captions bigger and the hook purple"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
          }
        }}
        aria-label="What should Claude change?"
      />
      {!text && !result ? (
        <div className="ask-examples">
          {EXAMPLES.map((x) => (
            <button key={x} className="chip tiny" onClick={() => setText(x)}>
              {x}
            </button>
          ))}
        </div>
      ) : null}
      <div className="row">
        <label className="check small grow">
          <input type="checkbox" checked={here} onChange={(e) => setHere(e.target.checked)} />
          About this moment ({formatTime(timeMs)})
        </label>
        <button className="btn primary small-btn" disabled={!text.trim() || busy} onClick={send}>
          {busy ? "Claude's on it…" : "Do it"}
        </button>
      </div>
      {result ? (
        <div className={`ask-result ${result.ok ? "" : "bad"}`}>
          <span className="grow">{result.message}</span>
          {result.ok ? <span className="muted small">Not right? Undo ↶ at the top.</span> : text.trim() ? (
            <button className="chip tiny" onClick={saveAsNote}>Save as a note</button>
          ) : null}
        </div>
      ) : null}
      {notes.length ? (
        <>
          <div className="label">Saved notes</div>
          <ul className="notes-list">
            {notes.map((n) => (
              <li key={n.id}>
                <button className="mono note-time" onClick={() => seekMs(n.atMs)} title="Jump to this moment">
                  {formatTime(n.atMs)}
                </button>
                <span className="grow">{n.text}</span>
                <button className="icon-btn" aria-label="Remove note" onClick={() => update({ notes: (reel.notes ?? []).filter((x) => x.id !== n.id) })}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="muted small">In Claude Code, say <strong>“apply my notes”</strong> to make these changes.</p>
        </>
      ) : null}
    </section>
  );
}

const WELCOME_KEY = "cutroom.welcomeSeen";

// A three-step "how this works" for someone's first reels, until they close it.
export function Welcome() {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (seen) return null;
  const close = () => {
    setSeen(true);
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      // Private browsing: it shows again next time, which is fine.
    }
  };
  return (
    <section className="welcome">
      <ol>
        <li><b>Watch it.</b> Claude already cut it, captioned it and put it in your brand.</li>
        <li><b>Change anything</b> by telling Claude below, or tap through the steps at the top.</li>
        <li><b>Save video</b> when you love it. That's it.</li>
      </ol>
      <button className="icon-btn" aria-label="Got it, hide this" onClick={close}>✕</button>
    </section>
  );
}
