import React, { useState } from "react";
import { formatTime, useEditor } from "./context";

// "Notes for Claude": pause on a moment, say what to change, and Claude applies them all when you
// ask ("apply my notes"). Times are in the finished reel, so they still make sense after cuts.
export function NotesBox() {
  const { reel, update, timeMs, seekMs } = useEditor();
  const [text, setText] = useState("");
  const notes = [...(reel.notes ?? [])].sort((a, b) => a.atMs - b.atMs);

  const add = () => {
    if (!text.trim()) return;
    update({ notes: [...(reel.notes ?? []), { id: `note-${Date.now()}`, atMs: Math.round(timeMs), text: text.trim() }] });
    setText("");
  };

  return (
    <section className="notes-box">
      <div className="notes-head">
        <strong>Notes for Claude</strong>
        <span className="muted small">Pause where something's off and say what to change.</span>
      </div>
      <div className="notes-add">
        <input
          value={text}
          placeholder={`What to change at ${formatTime(timeMs)}`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          aria-label="What to change at this moment"
        />
        <button className="chip accent" disabled={!text.trim()} onClick={add}>
          Add at {formatTime(timeMs)}
        </button>
      </div>
      {notes.length ? (
        <>
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
          <p className="muted small">Then tell Claude <strong>“apply my notes”</strong>. It makes the changes and clears the list.</p>
        </>
      ) : null}
    </section>
  );
}
