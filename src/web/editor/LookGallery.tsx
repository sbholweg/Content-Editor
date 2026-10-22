import { Thumbnail } from "@remotion/player";
import React, { useState } from "react";
import { outputFrames, Reel, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from "../../remotion/Reel";
import { STARTER_LOOKS } from "../../shared/looks";
import type { ReelProps, ReelStyle } from "../../shared/types";
import { useEditor } from "./context";

const same = (a: ReelStyle, b: ReelStyle) => JSON.stringify(a) === JSON.stringify(b);

// Every look as a little preview of this reel, so you pick by seeing, not by name.
export function LookGallery({ previewProps }: { previewProps: ReelProps }) {
  const { reel, update, brand, updateBrand, timeline } = useEditor();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  // A moment where both the hook and a caption are on screen.
  const frame = Math.min(outputFrames(previewProps) - 1, Math.round(((timeline.words[1]?.startMs ?? 600) / 1000) * REEL_FPS) + 4);

  const looks: { id: string; name: string; note: string; style: ReelStyle; mine?: boolean }[] = [
    { id: "default", name: "Your brand", note: "your default look", style: brand.defaultStyle },
    ...brand.looks.map((l) => ({ id: l.id, name: l.name, note: "saved look", style: l.style, mine: true })),
    ...STARTER_LOOKS,
  ];

  return (
    <div className="look-gallery-wrap">
      <div className="look-gallery">
        {looks.map((l) => (
          <div key={l.id} className={`look-tile ${same(reel.style, l.style) ? "on" : ""}`}>
            <button className="look-pick" onClick={() => update({ style: l.style })}>
              <Thumbnail
                component={Reel}
                inputProps={{ ...previewProps, brand: l.style }}
                frameToDisplay={Math.max(0, frame)}
                durationInFrames={outputFrames(previewProps)}
                fps={REEL_FPS}
                compositionWidth={REEL_WIDTH}
                compositionHeight={REEL_HEIGHT}
                style={{ width: "100%", aspectRatio: "9 / 16" }}
              />
              {same(reel.style, l.style) ? <span className="on-badge">On this reel</span> : null}
            </button>
            <div className="look-info">
              <strong>{l.name}</strong>
              <span className="muted small">{l.note}</span>
              {l.mine ? (
                <button
                  className="link danger small"
                  onClick={() => confirm(`Delete the look "${l.name}"?`) && updateBrand({ ...brand, looks: brand.looks.filter((x) => x.id !== l.id) })}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {naming ? (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            updateBrand({ ...brand, looks: [...brand.looks, { id: `look-${Date.now()}`, name: name.trim(), style: reel.style }] });
            setName("");
            setNaming(false);
          }}
        >
          <input className="grow" autoFocus value={name} placeholder="Name this look" onChange={(e) => setName(e.target.value)} />
          <button className="chip accent" type="submit">Save</button>
          <button className="link" type="button" onClick={() => setNaming(false)}>Cancel</button>
        </form>
      ) : (
        <div className="row">
          <button className="chip" onClick={() => setNaming(true)}>＋ Save this reel's look</button>
          <button className="chip" disabled={same(reel.style, brand.defaultStyle)} onClick={() => updateBrand({ ...brand, defaultStyle: reel.style })}>
            {same(reel.style, brand.defaultStyle) ? "✓ This is your default" : "Make this my default"}
          </button>
          <span className="muted small">Saw a caption style you love? Send Claude the video and say “make this a look”.</span>
        </div>
      )}
    </div>
  );
}
