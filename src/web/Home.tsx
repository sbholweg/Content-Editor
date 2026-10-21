import React, { useEffect, useRef, useState } from "react";
import type { Project } from "../shared/types";
import { api } from "./api";

export function Home({ onOpen, onAuthError }: { onOpen: (id: string) => void; onAuthError: (err: unknown) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listProjects().then(setProjects, onAuthError);
  }, [onAuthError]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(0);
    try {
      const project = await api.upload(file, setUploading);
      onOpen(project.id);
    } catch (err) {
      onAuthError(err);
      setError((err as Error).message);
    } finally {
      setUploading(null);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <main className="page stack">
      <header>
        <h1>Reel Editor</h1>
        <p className="muted">Upload a talking reel. You'll get captions, highlighted words and your brand styling.</p>
      </header>

      <input ref={input} type="file" accept="video/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <button className="primary big" disabled={uploading !== null} onClick={() => input.current?.click()}>
        {uploading === null ? "＋ Upload a reel" : `Uploading… ${Math.round(uploading * 100)}%`}
      </button>
      {uploading !== null ? (
        <>
          <div className="bar"><div style={{ width: `${uploading * 100}%` }} /></div>
          <p className="muted small">Keep this screen open until the upload finishes. Wi-Fi is fastest.</p>
        </>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      {projects.length > 0 ? (
        <section className="stack">
          <h2>Your reels</h2>
          {projects.map((p) => (
            <button key={p.id} className="row card" onClick={() => onOpen(p.id)}>
              <span className="grow left">
                <strong>{p.words.slice(0, 6).map((w) => w.text).join(" ") || p.originalName}</strong>
                <span className="muted small">{new Date(p.createdAt).toLocaleString()}</span>
              </span>
              <span className={`tag ${p.status}`}>{p.render.status === "done" ? "exported" : p.status}</span>
            </button>
          ))}
        </section>
      ) : null}
    </main>
  );
}
