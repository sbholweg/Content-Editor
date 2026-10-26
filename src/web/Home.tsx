import React, { useEffect, useRef, useState } from "react";
import { APP_TAGLINE } from "../shared/app";
import { plainHook } from "../shared/hookText";
import { IDEA_STARTERS } from "../shared/library";
import { GridPreview } from "./editor/FinishTab";
import { buildTimeline } from "../shared/timeline";
import type { Project, Recipe } from "../shared/types";
import { api, onEngineEvents, projectFileUrl } from "./api";
import { TopNav } from "./Brandmark";

type Folder = "edit" | "ready" | "posted";

// Which folder a reel lives in: still being edited, exported and ready to post, or posted.
export function folderOf(p: Project): Folder {
  if (p.posted) return "posted";
  return p.render.status === "done" ? "ready" : "edit";
}

const FOLDERS: { id: Folder; label: string; empty: string }[] = [
  { id: "edit", label: "To edit", empty: "New reels land here. Upload one above, or drop clips in your inbox folder and tell Claude “edit my new reels”." },
  { id: "ready", label: "Ready to post", empty: "Exported reels land here, ready to save and post." },
  { id: "posted", label: "Posted", empty: "Once you've posted a reel, mark it as posted in its Finish tab and it moves here." },
];

const fmt = (ms: number) => {
  const t = Math.round(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export function Home({ onOpen, onAuthError }: { onOpen: (id: string) => void; onAuthError: (err: unknown) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [folder, setFolder] = useState<Folder>("edit");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const autopilot = useRef(true);

  const [brandReady, setBrandReady] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  useEffect(() => {
    api.getBrand().then((b) => {
      setBrandReady(b.setUp);
      setRecipes(b.recipes);
    }, onAuthError);
  }, [onAuthError]);

  // Select mode: pick several reels and apply a recipe to all of them at once.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recipeId, setRecipeId] = useState("");
  const [applyNote, setApplyNote] = useState("");
  const [gridView, setGridView] = useState(false);
  const toggle = (id: string) => setSelected((s) => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const applyToSelected = async () => {
    const id = recipeId || recipes[0]?.id;
    if (!id || !selected.size) return;
    try {
      const r = await api.applyRecipe([...selected], { recipeId: id });
      setApplyNote(`“${r.recipe}” applied to ${r.applied} reel${r.applied === 1 ? "" : "s"}.${r.suggesting ? " Claude is suggesting graphics for each." : ""}`);
      setSelected(new Set());
      setSelecting(false);
    } catch (err) {
      onAuthError(err);
      setApplyNote((err as Error).message);
    }
  };

  useEffect(() => {
    api.listProjects().then(setProjects, onAuthError);
    // Reels imported by Claude appear here without a refresh.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onEngineEvents((event) => {
      if (event.type === "brand") return;
      clearTimeout(timer);
      timer = setTimeout(() => api.listProjects().then(setProjects, onAuthError), 500);
    });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [onAuthError]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(0);
    try {
      const project = await api.upload(file, autopilot.current, setUploading);
      onOpen(project.id);
    } catch (err) {
      onAuthError(err);
      setError((err as Error).message);
    } finally {
      setUploading(null);
      if (input.current) input.current.value = "";
    }
  };

  const pick = (auto: boolean) => {
    autopilot.current = auto;
    input.current?.click();
  };

  // Trial reels are listed under the reel they came from (in its Finish tab), not on their own.
  const reels = projects.filter((p) => !p.parentId);
  const trialCount = (id: string) => projects.filter((p) => p.parentId === id).length;
  const shown = reels.filter((p) => folderOf(p) === folder);

  return (
    <div className="site">
      <TopNav active="reels" right={<button className="btn primary small-btn" onClick={() => pick(false)}>＋ New reel</button>} />

      <main className="home">
        <section
          className={`hero ${dragging ? "dragging" : ""}`}
          onDragOver={(e) => (e.preventDefault(), setDragging(true))}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            autopilot.current = true;
            void onFile(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="hero-copy">
            <span className="eyebrow">{APP_TAGLINE}</span>
            <h1 className="display">
              Film it. We'll <span className="accent-text">cut</span> it.
            </h1>
            <p className="lede">Drop in a talking reel. The Cutroom trims the pauses and retakes, captions it in your brand, and hands you a reel, a carousel and stories, ready to post.</p>
          </div>

          <input ref={input} type="file" accept="video/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          {uploading === null ? (
            <div className="hero-actions">
              <button className="action-card primary" onClick={() => pick(true)}>
                <span className="action-icon">✨</span>
                <strong>Do it for me</strong>
                <span>Cut, captioned, styled and exported, with your post caption written.</span>
              </button>
              <button className="action-card" onClick={() => pick(false)}>
                <span className="action-icon">✂</span>
                <strong>I'll edit it myself</strong>
                <span>Upload, then cut and style it your way.</span>
              </button>
            </div>
          ) : (
            <div className="upload-progress">
              <strong>Uploading… {Math.round(uploading * 100)}%</strong>
              <div className="bar"><div style={{ width: `${uploading * 100}%` }} /></div>
              <span className="muted small">Keep this screen open until the upload finishes.</span>
            </div>
          )}
          <p className="muted small drop-hint">or drag a video anywhere in this box</p>
          {error ? <p className="error">{error}</p> : null}
        </section>

        {!brandReady ? (
          <a className="brand-nudge" href="#/brand">
            <span className="action-icon">🎨</span>
            <span className="grow left">
              <strong>Set up your brand kit</strong>
              <span>Upload a few images you love and get colors, fonts and a voice, so every reel looks like you.</span>
            </span>
            <span className="chip accent">Start ›</span>
          </a>
        ) : null}

        <section className="reels-section">
          {selecting ? (
            <div className="select-bar">
              <strong>{selected.size} selected</strong>
              {recipes.length ? (
                <>
                  <select value={recipeId || recipes[0].id} onChange={(e) => setRecipeId(e.target.value)} aria-label="Recipe to apply">
                    {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <button className="btn primary small-btn" disabled={!selected.size} onClick={applyToSelected}>Apply recipe</button>
                </>
              ) : (
                <span className="muted small">Save a recipe first: open a reel › Visuals › Recipes.</span>
              )}
              <button className="link" onClick={() => (setSelecting(false), setSelected(new Set()))}>Cancel</button>
            </div>
          ) : null}
          {applyNote ? <p className="small">{applyNote}</p> : null}
          <div className="folder-tabs" role="tablist">
            {FOLDERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={folder === f.id} className={folder === f.id ? "on" : ""} onClick={() => setFolder(f.id)}>
                {f.label} <span className="count">{reels.filter((p) => folderOf(p) === f.id).length}</span>
              </button>
            ))}
            {!selecting && shown.length ? <button className="select-toggle" onClick={() => setSelecting(true)}>Select</button> : null}
            <button className={`select-toggle ${gridView ? "on" : ""}`} onClick={() => setGridView(!gridView)}>▦ Grid</button>
          </div>

          {gridView ? (
            <div className="stack tight grid-view">
              <p className="muted small">Your profile grid once these are posted: ready-to-post reels first, then what's already up. Save a cover in a reel's Finish tab to see it here.</p>
              <GridPreview projects={[...reels.filter((p) => folderOf(p) === "ready"), ...reels.filter((p) => folderOf(p) === "posted")].slice(0, 12)} />
            </div>
          ) : null}

          {shown.length === 0 ? (
            <p className="empty muted">{FOLDERS.find((f) => f.id === folder)?.empty}</p>
          ) : (
            <div className="reel-grid">
              {shown.map((p) => {
                const length = buildTimeline(p.words, p.durationMs, p.removePauses, p.silences, p.style.speed).durationMs;
                const firstWord = p.words.find((w) => !w.cut);
                return (
                  <button key={p.id} className={`reel-card ${selecting && selected.has(p.id) ? "selected" : ""}`} onClick={() => (selecting ? toggle(p.id) : onOpen(p.id))} aria-pressed={selecting ? selected.has(p.id) : undefined}>
                    {selecting ? <span className="select-dot" aria-hidden>{selected.has(p.id) ? "✓" : ""}</span> : null}
                    <div className="reel-thumb">
                      {p.status === "ready" ? (
                        <img src={projectFileUrl(p.id, `frame-${Math.round(p.coverMs ?? firstWord?.startMs ?? 500)}.jpg`)} alt="" loading="lazy" />
                      ) : null}
                      <span className={`status ${p.status === "error" ? "bad" : ""}`}>
                        {p.status === "processing" ? "Working…" : p.status === "error" ? "Problem" : p.render.status === "rendering" ? "Exporting…" : fmt(length)}
                      </span>
                      {p.hookText ? <span className="thumb-hook">{plainHook(p.hookText)}</span> : null}
                    </div>
                    <div className="reel-meta">
                      <strong>{plainHook(p.hookText) || p.words.slice(0, 6).map((w) => w.text).join(" ") || p.originalName}</strong>
                      <span className="muted small">
                        {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        {trialCount(p.id) ? ` · ${trialCount(p.id)} trial reels` : ""}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <details className="ideas">
          <summary>💡 Not sure what to film? Get an idea</summary>
          <div className="ideas-grid">
            {IDEA_STARTERS.map((g) => (
              <div key={g.category}>
                <div className="label">{g.category}</div>
                <ul>
                  {g.ideas.map((idea) => (
                    <li key={idea}>
                      {idea} <a className="small" href={`#/prompter?idea=${encodeURIComponent(idea)}`}>✍️ Script it</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </main>
    </div>
  );
}
