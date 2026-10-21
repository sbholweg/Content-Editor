import React, { useRef, useState } from "react";
import { isLineCut } from "../../shared/lines";
import { BUILTIN_SOUNDS, builtinSound } from "../../shared/sounds";
import type { Asset, SoundCue } from "../../shared/types";
import { libraryUrl } from "../api";
import { Modal, useUpload } from "../Media";
import { Slider } from "../ui";
import { formatTime, useEditor } from "./context";

const sfxUrl = (file: string) => `/sfx/${file}`;

// One shared player so only one preview plays at a time.
let previewAudio: HTMLAudioElement | null = null;
function preview(src: string) {
  previewAudio?.pause();
  previewAudio = new Audio(src);
  void previewAudio.play().catch(() => {});
}

export function soundInfo(id: string, assets: Asset[]) {
  const b = builtinSound(id);
  if (b) return { name: b.name, src: sfxUrl(b.file), mine: false };
  const a = assets.find((x) => x.id === id);
  return a ? { name: a.name, src: libraryUrl(a.file), mine: true } : { name: "Missing sound", src: "", mine: true };
}

export function SoundTab() {
  const { reel, update, lines, outputTimes, assets, openPicker } = useEditor();
  const kept = lines.filter((l) => !isLineCut(l));
  const music = reel.music;
  const musicInfo = music ? soundInfo(music.soundId, assets) : null;

  const addForMe = () => {
    const cues: SoundCue[] = [...reel.sounds];
    // Keep sounds at least half a second apart so they don't pile up.
    const at = (wordId: string) => outputTimes.get(wordId)?.startMs;
    const crowded = (wordId: string) => cues.some((c) => Math.abs((at(c.wordId) ?? -1e9) - (at(wordId) ?? 1e9)) < 500);
    const add = (wordId: string, soundId: string) => {
      if (at(wordId) !== undefined && !crowded(wordId)) cues.push({ id: `snd-${Date.now()}-${cues.length}`, wordId, soundId, volume: 0.8 });
    };
    // A whoosh as the hook lands, a pop whenever something appears on screen, a sparkle on emojis.
    const first = reel.words.find((w) => !w.cut);
    if (first && reel.hookText) add(first.id, "sfx-whoosh");
    for (const o of reel.overlays) add(o.startWordId, o.placement === "full" ? "sfx-swoosh-in" : "sfx-pop");
    for (const w of reel.words) if (w.emoji && !w.cut) add(w.id, "sfx-sparkle");
    update({ sounds: cues, soundsEnabled: true });
  };

  return (
    <>
      <section className="panel-card">
        <header className="panel-head">
          <div>
            <h2>Your sound</h2>
            <p className="muted small">Timed to every move. Swap any sound in one tap.</p>
          </div>
        </header>

        <div className="sound-row music">
          <span className="mono accent-text">0:00</span>
          <span className="grow left">
            <strong>Music bed</strong>
            <span className="muted small">{musicInfo ? musicInfo.name : "No background music yet"}</span>
          </span>
          {music && musicInfo ? (
            <>
              <button className="icon-btn" onClick={() => preview(musicInfo.src)} aria-label="Play">▶</button>
              <button className="chip" onClick={() => openPicker({ kind: "music" })}>⇄ Swap</button>
              <Toggle on={music.enabled} onChange={(on) => update({ music: { ...music, enabled: on } })} />
            </>
          ) : (
            <button className="chip accent" onClick={() => openPicker({ kind: "music" })}>＋ Add music</button>
          )}
        </div>
        {music ? (
          <div className="music-settings">
            <Slider label="Music volume" value={Math.round(music.volume * 100)} min={5} max={100} onChange={(v) => update({ music: { ...music, volume: v / 100 } })} />
            <label className="check">
              <input type="checkbox" checked={music.duck} onChange={(e) => update({ music: { ...music, duck: e.target.checked } })} />
              Gets quieter while you talk
            </label>
            <button className="link danger" onClick={() => update({ music: null })}>Remove music</button>
          </div>
        ) : null}
      </section>

      <section className="panel-card">
        <header className="panel-head">
          <h3>Sound effects</h3>
          <div className="row">
            <button className="chip" onClick={addForMe}>✨ Add sounds for me</button>
            <Toggle on={reel.soundsEnabled} onChange={(on) => update({ soundsEnabled: on })} />
          </div>
        </header>
        <div className={`sound-lines ${reel.soundsEnabled ? "" : "muted-block"}`}>
          {kept.map((line) => {
            const ids = new Set(line.words.map((w) => w.id));
            const cues = reel.sounds.filter((c) => ids.has(c.wordId));
            const firstKept = line.words.find((w) => !w.cut)!;
            return (
              <div key={line.id} className="sound-line">
                <div className="muted small">
                  {String(line.number).padStart(2, "0")} · {line.words.filter((w) => !w.cut).map((w) => w.text).join(" ")}
                </div>
                {cues.map((c) => {
                  const info = soundInfo(c.soundId, assets);
                  const word = reel.words.find((w) => w.id === c.wordId);
                  const at = outputTimes.get(c.wordId);
                  return (
                    <div key={c.id} className="sound-row">
                      <span className="mono accent-text">{at ? formatTime(at.startMs) : "–"}</span>
                      <span className="grow left">
                        <strong>{info.name}</strong>
                        <span className="muted small">on “{word?.text}”</span>
                      </span>
                      <button className="icon-btn" onClick={() => info.src && preview(info.src)} aria-label="Play">▶</button>
                      <button className="chip" onClick={() => openPicker({ kind: "sound-swap", cueId: c.id })}>⇄ Swap</button>
                      <button className="icon-btn" aria-label="Remove" onClick={() => update({ sounds: reel.sounds.filter((x) => x.id !== c.id) })}>✕</button>
                    </div>
                  );
                })}
                <button className="add-look" onClick={() => openPicker({ kind: "sound-add", wordId: firstKept.id })}>＋ Add a sound</button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return <button role="switch" aria-checked={on} className={`toggle ${on ? "on" : ""}`} onClick={() => onChange(!on)} />;
}

// Pick a starter sound or one of yours (or upload a new one).
export function SoundPicker({ forMusic, onPick, onClose }: { forMusic: boolean; onPick: (soundId: string) => void; onClose: () => void }) {
  const { assets, setAssets, onAuthError } = useEditor();
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const { progress, error, upload } = useUpload((a) => setAssets([a, ...assets]), onAuthError);
  const q = query.trim().toLowerCase();
  const mine = assets.filter((a) => a.kind === "audio" && a.name.toLowerCase().includes(q));
  const starter = forMusic ? [] : BUILTIN_SOUNDS.filter((s) => `${s.name} ${s.tags}`.toLowerCase().includes(q));

  return (
    <Modal
      eyebrow={forMusic ? "Music bed" : "Sound effects"}
      title={forMusic ? "Choose background music" : "Find a sound"}
      subtitle={forMusic ? "Use a track you have the rights to. It loops if it's shorter than your reel." : undefined}
      onClose={onClose}
    >
      <input autoFocus value={query} placeholder="Find a sound" onChange={(e) => setQuery(e.target.value)} />
      <input
        ref={input}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button className="chip" disabled={progress !== null} onClick={() => input.current?.click()}>
        {progress === null ? "＋ Upload a sound (mp3, wav, m4a)" : `Uploading ${Math.round(progress * 100)}%`}
      </button>
      {error ? <p className="error small">{error}</p> : null}
      {mine.length ? (
        <>
          <div className="label">Your sounds</div>
          {mine.map((a) => (
            <SoundOption key={a.id} name={a.name} detail={`${(a.durationMs / 1000).toFixed(1)}s`} src={libraryUrl(a.file)} onPick={() => onPick(a.id)} />
          ))}
        </>
      ) : forMusic ? (
        <p className="muted small">Upload a track to use it as background music.</p>
      ) : null}
      {starter.length ? (
        <>
          <div className="label">Starter sounds</div>
          {starter.map((s) => (
            <SoundOption key={s.id} name={s.name} detail="" src={sfxUrl(s.file)} onPick={() => onPick(s.id)} />
          ))}
        </>
      ) : null}
    </Modal>
  );
}

function SoundOption({ name, detail, src, onPick }: { name: string; detail: string; src: string; onPick: () => void }) {
  return (
    <div className="sound-option">
      <button className="icon-btn" onClick={() => preview(src)} aria-label={`Play ${name}`}>▶</button>
      <button className="grow left sound-pick" onClick={onPick}>
        <strong>{name}</strong>
      </button>
      <span className="mono muted small">{detail}</span>
    </div>
  );
}
