import { Player, type PlayerRef } from "@remotion/player";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { durationInFrames, Reel, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from "../remotion/Reel";
import type { BrandKit, Project, ReelProps, Word } from "../shared/types";
import { api, mediaUrl } from "./api";
import { BrandPanel } from "./BrandPanel";
import { WordsPanel } from "./WordsPanel";

function useDebounced<T>(fn: (value: T) => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return useCallback(
    (value: T) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(value), ms);
    },
    [fn, ms],
  );
}

export function Editor({ id, onBack, onAuthError }: { id: string; onBack: () => void; onAuthError: (err: unknown) => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [brand, setBrand] = useState<BrandKit | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [tab, setTab] = useState<"words" | "style">("words");
  const [error, setError] = useState("");
  const [timeMs, setTimeMs] = useState(0);
  const [exportFile, setExportFile] = useState<File | null>(null);
  const [changedSinceExport, setChangedSinceExport] = useState(false);
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

  useEffect(() => {
    load().then((p) => p && setWords(p.words));
    api.getBrand().then(setBrand, onAuthError);
  }, [load, onAuthError]);

  // Poll while the server is working on this reel.
  const busy = project?.status === "processing" || project?.render.status === "rendering";
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(async () => {
      const p = await load();
      if (p && p.status === "ready" && project?.status === "processing") setWords(p.words);
    }, 2000);
    return () => clearInterval(t);
  }, [busy, load, project?.status]);

  // Fetch the finished file ahead of time so "Save" can open the share sheet instantly
  // (iPhones only allow sharing straight from a tap, not after a download).
  useEffect(() => {
    if (project?.render.status !== "done") return;
    let cancelled = false;
    fetch(mediaUrl(id, "export.mp4", project.render.progress + project.createdAt))
      .then((r) => r.blob())
      .then((blob) => !cancelled && setExportFile(new File([blob], "reel.mp4", { type: "video/mp4" })));
    return () => {
      cancelled = true;
    };
  }, [id, project?.render.status, project?.render.progress, project?.createdAt]);

  const saveWords = useDebounced<Word[]>(
    useCallback((w) => void api.saveWords(id, w).catch(onAuthError), [id, onAuthError]),
    600,
  );
  const saveBrand = useDebounced<BrandKit>(
    useCallback((b) => void api.saveBrand(b).catch(onAuthError), [onAuthError]),
    600,
  );

  const updateWords = (next: Word[]) => {
    setWords(next);
    setChangedSinceExport(true);
    saveWords(next);
  };
  const updateBrand = (next: BrandKit) => {
    setBrand(next);
    setChangedSinceExport(true);
    saveBrand(next);
  };

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setTimeMs((e.detail.frame / REEL_FPS) * 1000);
    p.addEventListener("frameupdate", onFrame);
    return () => p.removeEventListener("frameupdate", onFrame);
  }, [project?.status, brand]);

  const inputProps: ReelProps | null = useMemo(
    () =>
      project && brand
        ? { videoSrc: mediaUrl(id, "video.mp4"), words, brand, durationMs: project.durationMs }
        : null,
    [project?.durationMs, brand, words, id],
  );

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
  if (!project || !brand) return <div className="center muted">Loading…</div>;

  if (project.status === "processing" || project.status === "uploaded") {
    return (
      <main className="page stack center">
        <div className="spinner" />
        <h2>{project.step ?? "Working on it"}…</h2>
        <p className="muted">This usually takes about as long as the video itself. You can leave this page and come back.</p>
        <button onClick={onBack}>Back to my reels</button>
      </main>
    );
  }

  if (project.status === "error") {
    return (
      <main className="page stack center">
        <h2>Something went wrong</h2>
        <p className="error small">{project.error}</p>
        <button onClick={onBack}>Back</button>
      </main>
    );
  }

  const rendering = project.render.status === "rendering";

  return (
    <main className="editor">
      <div className="topbar">
        <button className="ghost" onClick={onBack}>‹ Reels</button>
        <div className="tabs">
          <button className={tab === "words" ? "on" : ""} onClick={() => setTab("words")}>Words</button>
          <button className={tab === "style" ? "on" : ""} onClick={() => setTab("style")}>Style</button>
        </div>
      </div>

      <div className="preview">
        {inputProps ? (
          <Player
            ref={player}
            component={Reel}
            inputProps={inputProps}
            durationInFrames={durationInFrames(project.durationMs)}
            fps={REEL_FPS}
            compositionWidth={REEL_WIDTH}
            compositionHeight={REEL_HEIGHT}
            controls
            clickToPlay
            style={{ width: "100%", height: "100%" }}
          />
        ) : null}
      </div>

      <div className="panel">
        {tab === "words" ? (
          <WordsPanel
            words={words}
            timeMs={timeMs}
            onChange={updateWords}
            onSeek={(ms) => player.current?.seekTo(Math.round((ms / 1000) * REEL_FPS))}
            onAuto={async () => {
              try {
                const p = await api.autoHighlight(id);
                setWords(p.words);
                setChangedSinceExport(true);
              } catch (err) {
                onAuthError(err);
              }
            }}
          />
        ) : (
          <BrandPanel brand={brand} onChange={updateBrand} />
        )}
      </div>

      <div className="exportbar">
        {rendering ? (
          <div className="grow stack tight">
            <span className="small">Exporting… {Math.round(project.render.progress * 100)}%</span>
            <div className="bar"><div style={{ width: `${project.render.progress * 100}%` }} /></div>
          </div>
        ) : project.render.status === "done" && !changedSinceExport ? (
          <>
            <button className="grow" onClick={exportReel}>Export again</button>
            <button className="primary grow" disabled={!exportFile} onClick={saveVideo}>
              {exportFile ? "Save video" : "Preparing…"}
            </button>
          </>
        ) : (
          <button className="primary grow" onClick={exportReel}>Export video</button>
        )}
      </div>
      {project.render.status === "error" ? <p className="error small pad">Export failed: {project.render.error}</p> : null}
    </main>
  );
}
