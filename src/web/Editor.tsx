import { Player, type PlayerRef } from "@remotion/player";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { registerCustomFonts } from "../remotion/fonts";
import { outputFrames, Reel, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from "../remotion/Reel";
import { buildLines } from "../shared/lines";
import { reelProps } from "../shared/props";
import { buildTimeline } from "../shared/timeline";
import type { Asset, BrandKit, Project } from "../shared/types";
import { api, libraryUrl, mediaUrl, onEngineEvents } from "./api";
import { CutTab } from "./editor/CutTab";
import { EditorContext, formatTime, type EditorApi, type PickerTarget, type ReelState } from "./editor/context";
import { FinishTab } from "./editor/FinishTab";
import { SoundPicker, SoundTab } from "./editor/SoundTab";
import { VisualsTab } from "./editor/VisualsTab";
import { LibraryBrowser, Modal } from "./Media";

const TABS = [
  { id: "cut", label: "Cut", next: "Next: Visuals" },
  { id: "visuals", label: "Visuals", next: "Next: Sound" },
  { id: "sound", label: "Sound", next: "Next: Finish" },
  { id: "finish", label: "Finish", next: "" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const EDITABLE: (keyof ReelState)[] = [
  "words", "hookText", "hookSubText", "postCaption", "removePauses", "style", "overlays", "sounds", "music", "soundsEnabled", "carousel", "stories",
];
const pickReel = (p: Project): ReelState => Object.fromEntries(EDITABLE.map((k) => [k, p[k]])) as ReelState;

export function Editor({ id, onBack, onAuthError }: { id: string; onBack: () => void; onAuthError: (err: unknown) => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [reel, setReel] = useState<ReelState | null>(null);
  const [brand, setBrand] = useState<BrandKit | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [tab, setTab] = useState<Tab>("cut");
  const [error, setError] = useState("");
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exportFile, setExportFile] = useState<File | null>(null);
  const [changedSinceExport, setChangedSinceExport] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }, []);
  const player = useRef<PlayerRef>(null);

  const load = useCallback(async () => {
    try {
      const p = await api.getProject(id);
      setProject(p);
      return p;
    } catch (err) {
      onAuthError(err);
      setError((err as Error).message);
      return null;
    }
  }, [id, onAuthError]);

  // Takes the saved version of everything you can edit. If it differs from what was already
  // shown (e.g. Claude changed the reel), the last export is out of date.
  const adopted = useRef("");
  const adopt = useCallback((p: Project) => {
    const next = pickReel(p);
    const content = JSON.stringify(next);
    if (adopted.current && adopted.current !== content && p.render.status === "done") setChangedSinceExport(true);
    adopted.current = content;
    setReel(next);
  }, []);

  useEffect(() => {
    load().then((p) => {
      if (!p) return;
      adopt(p);
      // Reels made with "Do it for me" open straight on the finished result.
      if (p.render.status !== "idle") setTab("finish");
    });
    api.getBrand().then(setBrand, onAuthError);
    api.listAssets().then(setAssets, onAuthError);
  }, [load, adopt, onAuthError]);

  // Saving: changes are collected and sent together shortly after you stop editing.
  const pending = useRef<Partial<ReelState>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastLocalEdit = useRef(0);
  const update = useCallback(
    (patch: Partial<ReelState>) => {
      lastLocalEdit.current = Date.now();
      setReel((prev) => (prev ? { ...prev, ...patch } : prev));
      setChangedSinceExport(true);
      pending.current = { ...pending.current, ...patch };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const changes = pending.current;
        pending.current = {};
        api.saveProject(id, changes).catch(onAuthError);
      }, 500);
    },
    [id, onAuthError],
  );

  // When Claude (or another tab) changes this reel, show it right away. Changes are only
  // taken over when you haven't edited in the last couple of seconds, so typing isn't lost.
  useEffect(
    () =>
      onEngineEvents(async (event) => {
        if (event.type === "brand") return void api.getBrand().then(setBrand, onAuthError);
        if (event.type !== "project" || event.id !== id) return;
        const p = await load();
        if (!p || Date.now() - lastLocalEdit.current < 2000) return;
        adopt(p);
        // Claude may have added media from the library.
        api.listAssets().then(setAssets, onAuthError);
      }),
    [id, load, adopt, onAuthError],
  );

  // Keep polling while the server works on this reel, in case live updates aren't getting through.
  const busy = project?.status === "processing" || project?.render.status === "rendering";
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(async () => {
      const p = await load();
      if (p && p.status === "ready" && !reel?.words.length) adopt(p);
    }, 2500);
    return () => clearInterval(t);
  }, [busy, load, adopt, reel?.words.length]);

  // Fetch the finished file ahead of time so "Save video" can open the share sheet instantly
  // (iPhones only allow sharing straight from a tap, not after a download).
  useEffect(() => {
    if (project?.render.status !== "done") return;
    let cancelled = false;
    fetch(mediaUrl(id, "export.mp4", String(project.rev ?? project.createdAt)))
      .then((r) => r.blob())
      .then((blob) => !cancelled && setExportFile(new File([blob], "reel.mp4", { type: "video/mp4" })));
    return () => {
      cancelled = true;
    };
  }, [id, project?.render.status, project?.rev, project?.createdAt]);

  const updateBrand = useCallback(
    (next: BrandKit) => {
      setBrand(next);
      api.saveBrand(next).catch(onAuthError);
    },
    [onAuthError],
  );

  useEffect(() => {
    registerCustomFonts(assets.filter((a) => a.kind === "font").map((a) => ({ name: a.name, url: libraryUrl(a.file) })));
  }, [assets]);

  const timeline = useMemo(
    () => buildTimeline(reel?.words ?? [], project?.durationMs ?? 0, reel?.removePauses ?? false, project?.silences),
    [reel?.words, project?.durationMs, reel?.removePauses, project?.silences],
  );
  const outputTimes = useMemo(() => new Map(timeline.words.map((w) => [w.id, w])), [timeline]);
  const lines = useMemo(() => buildLines(reel?.words ?? []), [reel?.words]);

  const inputProps = useMemo(
    () =>
      project && reel
        ? reelProps({ ...reel, durationMs: project.durationMs, silences: project.silences }, assets, {
            video: mediaUrl(id, "video.mp4"),
            library: libraryUrl,
            sfx: (file) => `/sfx/${file}`,
          })
        : null,
    [project?.durationMs, project?.silences, reel, assets, id],
  );

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setTimeMs((e.detail.frame / REEL_FPS) * 1000);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, [inputProps !== null]);

  const seekMs = (ms: number) => player.current?.seekTo(Math.round((ms / 1000) * REEL_FPS));

  const exportReel = async () => {
    setExportFile(null);
    setChangedSinceExport(false);
    try {
      setProject(await api.render(id));
    } catch (err) {
      onAuthError(err);
      setError((err as Error).message);
    }
  };

  const saveVideo = async () => {
    if (!exportFile) return;
    if (navigator.canShare?.({ files: [exportFile] })) {
      try {
        await navigator.share({ files: [exportFile] });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(exportFile);
    a.download = "reel.mp4";
    a.click();
  };

  if (error && !project) return <div className="center error">{error}</div>;
  if (!project || !brand || !reel) return <div className="center muted">Loading…</div>;

  if (project.status === "processing" || project.status === "uploaded") {
    return (
      <main className="page stack center">
        <div className="spinner" />
        <h2>{project.step ?? "Working on it"}…</h2>
        <p className="muted">This usually takes about as long as the video itself. You can leave this page and come back.</p>
        <button className="btn" onClick={onBack}>Back to my reels</button>
      </main>
    );
  }

  if (project.status === "error") {
    return (
      <main className="page stack center">
        <h2>Something went wrong</h2>
        <p className="error small">{project.error}</p>
        <button className="btn" onClick={onBack}>Back</button>
      </main>
    );
  }

  const rendering = project.render.status === "rendering";
  const exportControls = rendering ? (
    <div className="grow stack tight">
      <span className="small">Exporting… {Math.round(project.render.progress * 100)}%</span>
      <div className="bar"><div style={{ width: `${project.render.progress * 100}%` }} /></div>
    </div>
  ) : project.render.status === "done" && !changedSinceExport ? (
    <>
      <button className="btn" onClick={exportReel}>Export again</button>
      <button className="btn primary" disabled={!exportFile} onClick={saveVideo}>
        {exportFile ? "Save video" : "Preparing…"}
      </button>
    </>
  ) : (
    <button className="btn primary" onClick={exportReel}>✓ Export</button>
  );

  const current = TABS.findIndex((t) => t.id === tab);
  const editor: EditorApi = {
    project,
    reel,
    update,
    brand,
    updateBrand,
    assets,
    setAssets,
    timeline,
    outputTimes,
    lines,
    timeMs,
    seekToWord: (wordId) => {
      const out = outputTimes.get(wordId);
      if (out) seekMs(out.startMs);
    },
    openPicker: setPicker,
    notify,
    onAuthError,
  };

  return (
    <EditorContext.Provider value={editor}>
      <main className="studio">
        <header className="studio-head">
          <button className="link" onClick={onBack}>‹ My reels</button>
          <div className="studio-title">
            <strong>{reel.hookText || project.originalName}</strong>
            <span className="muted small">
              {project.variantLabel ? `Trial reel · ${project.variantLabel} · ` : ""}
              {formatTime(timeline.durationMs)} long
            </span>
          </div>
          <nav className="tabs" role="tablist">
            {TABS.map((t, i) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
                {i < current ? "✓ " : tab === t.id ? "● " : ""}
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="studio-body">
          <div className="studio-main">
            {tab === "cut" ? (
              <CutTab
                onTightened={(p) => {
                  setProject(p);
                  notify(`Tightened: now ${formatTime(buildTimeline(p.words, p.durationMs, true, p.silences).durationMs)} long. Cut lines are at the bottom.`);
                }}
              />
            ) : null}
            {tab === "visuals" && inputProps ? <VisualsTab previewProps={inputProps} /> : null}
            {tab === "sound" ? <SoundTab /> : null}
            {tab === "finish" ? <FinishTab exportControls={exportControls} /> : null}
          </div>

          <aside className="studio-preview">
            <div className="phone">
              <span className="phone-badge">Preview</span>
              {inputProps ? (
                <Player
                  ref={player}
                  component={Reel}
                  inputProps={inputProps}
                  durationInFrames={outputFrames(inputProps)}
                  fps={REEL_FPS}
                  compositionWidth={REEL_WIDTH}
                  compositionHeight={REEL_HEIGHT}
                  clickToPlay
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </aside>
        </div>

        <footer className="studio-bar">
          <button className="play" onClick={() => player.current?.toggle()} aria-label={playing ? "Pause" : "Play"}>
            {playing ? "❚❚" : "▶"}
          </button>
          <span className="mono time">
            <strong>{formatTime(timeMs)}</strong> / {formatTime(timeline.durationMs)}
          </span>
          <input
            className="scrub"
            type="range"
            min={0}
            max={Math.max(1, timeline.durationMs)}
            value={Math.min(timeMs, timeline.durationMs)}
            onChange={(e) => seekMs(Number(e.target.value))}
            aria-label="Position in the reel"
          />
          <div className="bar-actions">
            {tab === "finish" ? exportControls : <button className="btn primary" onClick={() => setTab(TABS[current + 1].id)}>{TABS[current].next} ›</button>}
          </div>
        </footer>
      </main>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
      {picker ? <PickerModal target={picker} onClose={() => setPicker(null)} /> : null}
    </EditorContext.Provider>
  );
}

// The library or sound picker, depending on what it was opened for.
function PickerModal({ target, onClose }: { target: PickerTarget; onClose: () => void }) {
  return (
    <EditorContext.Consumer>
      {(ctx) => {
        if (!ctx) return null;
        const { reel, update, assets, setAssets, onAuthError } = ctx;

        if (target.kind === "music" || target.kind === "sound-add" || target.kind === "sound-swap") {
          return (
            <SoundPicker
              forMusic={target.kind === "music"}
              onClose={onClose}
              onPick={(soundId) => {
                if (target.kind === "music") update({ music: { soundId, volume: reel.music?.volume ?? 0.35, duck: reel.music?.duck ?? true, enabled: true } });
                if (target.kind === "sound-add") {
                  update({ sounds: [...reel.sounds, { id: `snd-${Date.now()}`, soundId, wordId: target.wordId, volume: 0.8 }], soundsEnabled: true });
                }
                if (target.kind === "sound-swap") update({ sounds: reel.sounds.map((s) => (s.id === target.cueId ? { ...s, soundId } : s)) });
                onClose();
              }}
            />
          );
        }

        const wordId = target.kind === "overlay-add" ? target.fromWordId : reel.overlays.find((o) => o.id === target.overlayId)?.startWordId;
        const i = reel.words.findIndex((w) => w.id === wordId);
        const lineText = reel.words.slice(Math.max(0, i), i + 8).map((w) => w.text).join(" ");
        return (
          <Modal eyebrow="Your library" title="Add an image, GIF or b-roll" subtitle={`“${lineText}”`} onClose={onClose}>
            <p className="muted small">
              Images and GIFs pop up over your video on this line. B-roll fills the screen with its sound off, while your voice keeps going.
            </p>
            <LibraryBrowser
              assets={assets}
              onAssets={setAssets}
              onAuthError={onAuthError}
              onPick={(asset) => {
                if (target.kind === "overlay-swap") {
                  update({ overlays: reel.overlays.map((o) => (o.id === target.overlayId ? { ...o, assetId: asset.id } : o)) });
                } else {
                  update({
                    overlays: [
                      ...reel.overlays,
                      {
                        id: `ov-${Date.now()}`,
                        assetId: asset.id,
                        startWordId: target.fromWordId,
                        endWordId: target.toWordId,
                        placement: asset.kind === "video" ? "full" : "middle",
                        size: 0.6,
                      },
                    ],
                  });
                }
                onClose();
              }}
            />
          </Modal>
        );
      }}
    </EditorContext.Consumer>
  );
}
