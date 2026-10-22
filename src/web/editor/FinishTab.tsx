import React, { useState } from "react";
import { toOriginalMs } from "../../shared/timeline";
import type { Project } from "../../shared/types";
import { BusinessCard, PostCaptionCard } from "../sections";
import { TrialReelsCard } from "../TrialReels";
import { api, projectFileUrl } from "../api";
import { formatTime, useEditor } from "./context";
import { RepurposeCard } from "./Repurpose";

// Pick the cover: whatever frame is showing in the preview right now.
function CoverCard() {
  const { project, timeline, timeMs, onAuthError, notify } = useEditor();
  const [coverMs, setCoverMs] = useState(project.coverMs);
  return (
    <section className="panel-card">
      <div className="cover-row">
        <div className="cover-thumb">
          {coverMs !== undefined ? <img src={projectFileUrl(project.id, `frame-${Math.round(coverMs)}.jpg`)} alt="Your cover" /> : <span className="muted small">No cover yet</span>}
        </div>
        <div className="stack tight grow">
          <h3>Cover</h3>
          <p className="muted small">Pause the preview on a frame you like (looking at the camera, mid-expression), then save it as your cover. It lands in your outputs folder with the reel.</p>
          <div className="row">
            <button
              className="chip accent"
              onClick={async () => {
                const ms = Math.round(toOriginalMs(timeline.segments, timeMs));
                setCoverMs(ms);
                await api.saveProject(project.id, { coverMs: ms }).catch(onAuthError);
                notify("Cover saved. Download it below, or find it in your outputs folder after exporting.");
              }}
            >
              📸 Use this frame
            </button>
            {coverMs !== undefined ? (
              <a className="chip" href={projectFileUrl(project.id, `frame-${Math.round(coverMs)}.jpg`)} download="cover.jpg">
                Download cover
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinishTab({ exportControls, onProject }: { exportControls: React.ReactNode; onProject: (p: Project) => void }) {
  const { project, reel, update, timeline, brand, updateBrand, onAuthError } = useEditor();
  return (
    <>
      <section className="panel-card">
        <header className="panel-head">
          <div>
            <h2>Finish</h2>
            <p className="muted small">Export your reel at full quality, ready to post.</p>
          </div>
          <span className="mono muted">{formatTime(timeline.durationMs)} long</span>
        </header>
        <div className="row">{exportControls}</div>
        {project.render.status === "error" ? <p className="error small">Export failed: {project.render.error}</p> : null}
      </section>

      <CoverCard />

      <section className="panel-card">
        <div className="row">
          <div className="grow">
            <h3>Posted it?</h3>
            <p className="muted small">Mark it as posted to move it to your Posted folder.</p>
          </div>
          <button
            className={`chip ${project.posted ? "accent" : ""}`}
            onClick={async () => {
              const p = await api.saveProject(project.id, { posted: !project.posted }).catch(onAuthError);
              if (p) onProject(p);
            }}
          >
            {project.posted ? "✓ Posted" : "Mark as posted"}
          </button>
        </div>
      </section>

      {!project.parentId ? (
        <TrialReelsCard projectId={project.id} onOpen={(id) => (window.location.hash = `#/p/${id}`)} onAuthError={onAuthError} />
      ) : null}

      <PostCaptionCard
        caption={reel.postCaption}
        brand={brand}
        onBrand={updateBrand}
        onChange={(postCaption) => update({ postCaption })}
        onWrite={async (cta) => {
          try {
            const p = await api.writeCaption(project.id, cta);
            update({ postCaption: p.postCaption });
          } catch (err) {
            onAuthError(err);
          }
        }}
      />

      {!project.parentId ? <RepurposeCard /> : null}

      <BusinessCard brand={brand} onBrand={updateBrand} />
    </>
  );
}
