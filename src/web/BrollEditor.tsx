import { Player } from "@remotion/player";
import React, { useEffect, useRef, useState } from "react";
import { BROLL_FPS, brollFrames, BrollReel } from "../remotion/BrollReel";
import { REEL_HEIGHT, REEL_WIDTH } from "../remotion/Reel";
import { brollProps } from "../shared/props";
import type { Asset, Project } from "../shared/types";
import { api, libraryUrl, mediaUrl } from "./api";
import { TopNav } from "./Brandmark";
import { Thumb } from "./Media";
import { Label, Slider } from "./ui";

// A b-roll trial reel: pick the clips, tweak the hook and caption, export.
export function BrollEditor({ project: initial, onAuthError }: { project: Project; onAuthError: (err: unknown) => void }) {
  const [project, setProject] = useState(initial);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    api.listAssets().then(setAssets, onAuthError);
  }, [onAuthError]);

  // Follow export progress.
  useEffect(() => {
    if (project.render.status !== "rendering") return;
    const t = setInterval(() => api.getProject(project.id).then(setProject, onAuthError), 2500);
    return () => clearInterval(t);
  }, [project.render.status, project.id, onAuthError]);

  const update = (patch: Partial<Project>) => {
    const next = { ...project, ...patch, render: project.render.status === "done" ? { status: "idle" as const, progress: 0 } : project.render };
    setProject(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => api.saveProject(project.id, patch).catch(onAuthError), 500);
  };

  const clips = assets.filter((a) => a.kind === "video");
  const chosen = project.broll?.clipIds ?? [];
  const props = brollProps(project, assets, { library: libraryUrl, sfx: (f) => `/sfx/${f}` });

  return (
    <div className="site">
      <TopNav
        active="reels"
        right={<a className="btn small-btn" href={`#/p/${project.parentId}`}>‹ Back to the reel</a>}
      />
      <main className="broll-editor">
        <div className="stack">
          <section className="panel-card">
            <span className="eyebrow">Trial reel · {project.variantLabel}</span>
            <h2>B-roll trial reel</h2>
            <p className="muted small">A short b-roll reel with your hook on screen. The details live in the caption.</p>
            <Label>Hook on screen</Label>
            <input className="hook-input" value={project.hookText} onChange={(e) => update({ hookText: e.target.value })} />
            <Label>Small line under it</Label>
            <input value={project.hookSubText} onChange={(e) => update({ hookSubText: e.target.value })} />
            <Slider
              label={`Length · ${Math.round((project.broll?.lengthMs ?? 7000) / 1000)} seconds`}
              value={Math.round((project.broll?.lengthMs ?? 7000) / 1000)}
              min={4}
              max={15}
              onChange={(v) => update({ broll: { clipIds: chosen, lengthMs: v * 1000 } })}
            />
          </section>

          <section className="panel-card">
            <h3>Clips</h3>
            <p className="muted small">Tap to add or remove. They play in the order you pick them.</p>
            <div className="asset-grid">
              {clips.map((a) => {
                const n = chosen.indexOf(a.id);
                return (
                  <div key={a.id} className={`asset ${n >= 0 ? "picked" : ""}`}>
                    <button
                      className="asset-pick"
                      onClick={() => update({ broll: { lengthMs: project.broll?.lengthMs ?? 7000, clipIds: n >= 0 ? chosen.filter((x) => x !== a.id) : [...chosen, a.id] } })}
                    >
                      <Thumb asset={a} />
                      {n >= 0 ? <span className="asset-kind">{n + 1}</span> : null}
                      <span className="asset-name">{a.name}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel-card">
            <div className="row">
              <h3 className="grow">Caption</h3>
              <button
                className="chip"
                onClick={async () => {
                  await navigator.clipboard.writeText(project.postCaption).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied ✓" : "Copy caption"}
              </button>
            </div>
            <textarea className="caption-input" rows={12} value={project.postCaption} onChange={(e) => update({ postCaption: e.target.value })} />
          </section>
        </div>

        <aside className="studio-preview">
          <div className="phone">
            <Player
              component={BrollReel}
              inputProps={props}
              durationInFrames={brollFrames(props.lengthMs)}
              fps={BROLL_FPS}
              compositionWidth={REEL_WIDTH}
              compositionHeight={REEL_HEIGHT}
              controls
              loop
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            {project.render.status === "rendering" ? (
              <div className="grow stack tight">
                <span className="small">Exporting… {Math.round(project.render.progress * 100)}%</span>
                <div className="bar"><div style={{ width: `${project.render.progress * 100}%` }} /></div>
              </div>
            ) : project.render.status === "done" ? (
              <a className="btn primary grow" href={mediaUrl(project.id, "export.mp4", String(project.rev ?? ""))} download="trial-reel.mp4">Save video</a>
            ) : (
              <button className="btn primary grow" disabled={!chosen.length} onClick={async () => setProject(await api.render(project.id).catch((e) => (onAuthError(e), project)))}>
                ✓ Export
              </button>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
