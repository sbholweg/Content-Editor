import { APP_NAME } from "../shared/app";
import React, { useEffect, useRef, useState } from "react";
import type { Project } from "../shared/types";
import { IDEA_STARTERS } from "../shared/library";
import { api, onEngineEvents } from "./api";

export function Home({ onOpen, onAuthError }: { onOpen: (id: string) => void; onAuthError: (err: unknown) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const autopilot = useRef(true);

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

  // Trial reels are listed under the reel they came from (in its Finish tab), not on their own.
  const trialCount = (id: string) => projects.filter((p) => p.parentId === id).length;

  return (
    <main className="page stack">
      <header>
        <h1 className="serif">{APP_NAME}</h1>
        <p className="muted">Upload a talking reel. We'll cut it, caption it and style it in your brand. You just tweak.</p>
      </header>

      <input ref={input} type="file" accept="video/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {uploading === null ? (
        <div className="upload-choices">
          <button
            className="upload-choice primary"
            onClick={() => {
              autopilot.current = true;
              input.current?.click();
            }}
          >
            <strong>✨ Do it for me</strong>
            <span>Upload and get back a finished reel: cut, captioned, styled and exported, with your post caption written.</span>
          </button>
          <button
            className="upload-choice"
            onClick={() => {
              autopilot.current = false;
              input.current?.click();
            }}
          >
            <strong>＋ I'll edit it myself</strong>
            <span>Upload, then cut and style it your way.</span>
          </button>
        </div>
      ) : (
        <button className="btn primary big" disabled>
          Uploading… {Math.round(uploading * 100)}%
        </button>
      )}
      {uploading !== null ? (
        <>
          <div className="bar"><div style={{ width: `${uploading * 100}%` }} /></div>
          <p className="muted small">Keep this screen open until the upload finishes. Wi-Fi is fastest.</p>
        </>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      <details className="ideas">
        <summary>💡 Not sure what to film?</summary>
        <div className="stack">
          {IDEA_STARTERS.map((g) => (
            <div key={g.category}>
              <div className="label">{g.category}</div>
              <ul>
                {g.ideas.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {projects.length > 0 ? (
        <section className="stack">
          <h2 className="serif">Your reels</h2>
          {projects.filter((p) => !p.parentId).map((p) => (
            <button key={p.id} className="reel-item" onClick={() => onOpen(p.id)}>
              <span className="grow left">
                <strong>{p.hookText || p.words.slice(0, 6).map((w) => w.text).join(" ") || p.originalName}</strong>
                <span className="muted small">
                  {new Date(p.createdAt).toLocaleString()}
                  {trialCount(p.id) ? ` · ${trialCount(p.id)} trial reels` : ""}
                </span>
              </span>
              <span className={`tag ${p.status}`}>{p.render.status === "done" ? "exported" : p.status}</span>
            </button>
          ))}
        </section>
      ) : null}
    </main>
  );
}
