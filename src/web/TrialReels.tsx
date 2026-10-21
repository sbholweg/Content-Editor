import React, { useEffect, useState } from "react";
import type { Project } from "../shared/types";
import { api, mediaUrl } from "./api";
import { Card } from "./ui";

// Trial reels: three versions of this reel with different hooks, exported automatically.
export function TrialReelsCard({ projectId, onOpen, onAuthError }: { projectId: string; onOpen: (id: string) => void; onAuthError: (err: unknown) => void }) {
  const [trials, setTrials] = useState<Project[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listTrialReels(projectId).then(setTrials, onAuthError);
  }, [projectId, onAuthError]);

  const working = trials.some((t) => t.render.status === "rendering");
  useEffect(() => {
    if (!working) return;
    const timer = setInterval(() => api.listTrialReels(projectId).then(setTrials, onAuthError), 3000);
    return () => clearInterval(timer);
  }, [working, projectId, onAuthError]);

  return (
    <Card title="Trial reels">
      <p className="muted small">
        Instagram shows trial reels to non-followers first. Make three versions with different hooks, post each as a trial, and keep the winner.
      </p>
      <div className="row">
        <button
          className="chip accent"
          disabled={busy || working}
          onClick={async () => {
            setBusy(true);
            try {
              const made = await api.makeTrialReels(projectId);
              setTrials((prev) => [...made, ...prev]);
            } catch (err) {
              onAuthError(err);
            }
            setBusy(false);
          }}
        >
          {busy ? "Writing hooks…" : trials.length ? "✨ Make 3 more" : "✨ Make 3 trial reels"}
        </button>
      </div>
      {trials.length ? (
        <div className="trials">
          {trials.map((t) => (
            <div key={t.id} className="trial">
              <div className="grow left">
                <span className="tag">{t.variantLabel}</span>
                <strong className="trial-hook serif">{t.hookText}</strong>
                {t.render.status === "rendering" ? (
                  <div className="bar"><div style={{ width: `${t.render.progress * 100}%` }} /></div>
                ) : t.render.status === "error" ? (
                  <span className="error small">Export failed. Open it to try again.</span>
                ) : null}
              </div>
              <div className="trial-actions">
                <button className="chip" onClick={() => onOpen(t.id)}>Edit</button>
                {t.render.status === "done" ? (
                  <a className="chip accent" href={mediaUrl(t.id, "export.mp4", t.createdAt)} download="trial-reel.mp4">
                    Save
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
