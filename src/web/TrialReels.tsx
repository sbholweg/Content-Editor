import React, { useEffect, useState } from "react";
import type { Asset, Project } from "../shared/types";
import { api, mediaUrl } from "./api";
import { Card } from "./ui";

// Trial reels: three short b-roll reels on the same topic, each with a different hook on screen
// and the substance of the talking reel in the caption. Exported automatically.
export function TrialReelsCard({ projectId, onOpen, onAuthError }: { projectId: string; onOpen: (id: string) => void; onAuthError: (err: unknown) => void }) {
  const [trials, setTrials] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listTrialReels(projectId).then(setTrials, onAuthError);
    api.listAssets().then(setAssets, onAuthError);
  }, [projectId, onAuthError]);

  const working = trials.some((t) => t.render.status === "rendering");
  useEffect(() => {
    if (!working) return;
    const timer = setInterval(() => api.listTrialReels(projectId).then(setTrials, onAuthError), 3000);
    return () => clearInterval(timer);
  }, [working, projectId, onAuthError]);

  const broll = assets.filter((a) => a.kind === "video").length;

  return (
    <Card title="Trial reels">
      <p className="muted small">
        Instagram shows trial reels to non-followers first. We turn this reel into three short b-roll reels on the same topic, each with a
        different hook on screen and the details in the caption. Post each as a trial and keep the winner.
      </p>
      <p className="small">
        <strong>{broll ? `${broll} b-roll clip${broll === 1 ? "" : "s"} ready.` : "No b-roll yet."}</strong>{" "}
        <span className="muted">Add clips to the <strong>broll</strong> folder on your computer, or upload them in Visuals › Lines & media › Your library.</span>
      </p>
      <div className="row">
        <button
          className="chip accent"
          disabled={busy || working || broll === 0}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const made = await api.makeTrialReels(projectId);
              setTrials((prev) => [...made, ...prev]);
            } catch (err) {
              onAuthError(err);
              setError((err as Error).message);
            }
            setBusy(false);
          }}
        >
          {busy ? "Writing hooks & captions…" : trials.length ? "✨ Make 3 more" : "✨ Make 3 trial reels"}
        </button>
      </div>
      {error ? <p className="error small">{error}</p> : null}
      {trials.length ? (
        <div className="trials">
          {trials.map((t) => (
            <div key={t.id} className="trial">
              <div className="grow left">
                <span className="tag">{t.variantLabel}</span>
                <strong className="trial-hook">{t.hookText}</strong>
                {t.kind === "broll" ? <span className="muted small">b-roll · {Math.round((t.broll?.lengthMs ?? 7000) / 1000)}s · caption ready</span> : null}
                {t.render.status === "rendering" ? (
                  <div className="bar"><div style={{ width: `${t.render.progress * 100}%` }} /></div>
                ) : t.render.status === "error" ? (
                  <span className="error small">Export failed. Open it to try again.</span>
                ) : null}
              </div>
              <div className="trial-actions">
                <button className="chip" onClick={() => onOpen(t.id)}>Edit</button>
                {t.render.status === "done" ? (
                  <a className="chip accent" href={mediaUrl(t.id, "export.mp4", String(t.rev ?? t.createdAt))} download="trial-reel.mp4">
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
