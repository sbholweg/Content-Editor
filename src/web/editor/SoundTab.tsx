import React, { useRef, useState } from "react";
import { autoSounds } from "../../shared/autoSounds";
import { BUILTIN_SOUNDS, builtinSound, SOUND_GROUP_HINTS, SOUND_GROUPS } from "../../shared/sounds";
import type { Asset } from "../../shared/types";
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
  const { project, reel, update, outputTimes, assets, openPicker, notify, timeMs, timeline, seekMs } = useEditor();
  const [showAll, setShowAll] = useState(false);
  // The word playing at the paused moment, to add a sound right there.
  const hereWord = timeline.words.find((w) => timeMs < w.endMs) ?? timeline.words.at(-1);
  const clean = reel.style.cleanAudio;
  const cleanStatus = project.cleanAudio;
  const music = reel.music;
  const musicInfo = music ? soundInfo(music.soundId, assets) : null;

  const addForMe = () => {
    const sounds = autoSounds(reel, assets);
    const added = sounds.length - reel.sounds.length;
    update({ sounds, soundsEnabled: true });
    notify(added ? `Added ${added} sound${added === 1 ? "" : "s"}: clicks on key words, pops on stickers, shutters on screenshots, cha-ching on money talk.` : "No new spots for sounds. Add key words, emojis or media first.");
  };

  return (
    <>
      <section className="panel-card">
        <div className="row">
          <div className="grow">
            <h3>Clean up my voice</h3>
            <p className="muted small">Less background hiss and hum, even volume, and as loud as other reels in the feed. Your original stays untouched.</p>
            {clean && cleanStatus !== "ready" ? (
              <p className="small">{cleanStatus === "error" ? "Couldn't clean this one. Turn it off and on to try again." : "Cleaning… about half a minute. The preview switches over when it's ready."}</p>
            ) : null}
          </div>
          <Toggle on={Boolean(clean)} onChange={(on) => update({ style: { ...reel.style, cleanAudio: on } })} />
        </div>
      </section>

      <section className="panel-card">
        <div className="sound-row music">
          <span className="mono accent-text">0:00</span>
          <span className="grow left">
            <strong>Background music</strong>
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
          <div>
            <h3>Sound effects</h3>
            <p className="muted small">
              {reel.sounds.length ? `${reel.sounds.length} sound${reel.sounds.length === 1 ? "" : "s"}, timed to your words.` : "Little clicks and pops on key moments."}
            </p>
          </div>
          <Toggle on={reel.soundsEnabled} onChange={(on) => update({ soundsEnabled: on })} />
        </header>
        <div className="row wrap">
          <button className="chip accent" onClick={addForMe}>✨ {reel.sounds.length ? "Add more for me" : "Add sounds for me"}</button>
          {hereWord ? (
            <button className="chip" onClick={() => openPicker({ kind: "sound-add", wordId: hereWord.id })}>＋ Add one at {formatTime(timeMs)}</button>
          ) : null}
          {reel.sounds.length ? (
            <button className="chip" onClick={() => setShowAll(!showAll)}>{showAll ? "Hide the list" : `See all ${reel.sounds.length} ▾`}</button>
          ) : null}
        </div>
        {showAll ? (
          <div className={`sound-lines ${reel.soundsEnabled ? "" : "muted-block"}`}>
            {[...reel.sounds]
              .sort((a, b) => (outputTimes.get(a.wordId)?.startMs ?? 0) - (outputTimes.get(b.wordId)?.startMs ?? 0))
              .map((c) => {
                const info = soundInfo(c.soundId, assets);
                const word = reel.words.find((w) => w.id === c.wordId);
                const at = outputTimes.get(c.wordId);
                return (
                  <div key={c.id} className="sound-row">
                    <button className="mono accent-text link" onClick={() => at && seekMs(at.startMs)} title="Jump there">{at ? formatTime(at.startMs) : "–"}</button>
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
          </div>
        ) : null}
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
      {SOUND_GROUPS.map((g) => {
        const inGroup = starter.filter((s) => s.group === g);
        return inGroup.length ? (
          <React.Fragment key={g}>
            <div className="label">{g}</div>
            {q ? null : <p className="muted small group-hint">{SOUND_GROUP_HINTS[g]}</p>}
            {inGroup.map((s) => (
              <SoundOption key={s.id} name={s.name} detail="" src={sfxUrl(s.file)} onPick={() => onPick(s.id)} />
            ))}
          </React.Fragment>
        ) : null;
      })}
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
