import React from "react";
import { BusinessCard, PostCaptionCard } from "../sections";
import { TrialReelsCard } from "../TrialReels";
import { api } from "../api";
import { formatTime, useEditor } from "./context";

export function FinishTab({ exportControls }: { exportControls: React.ReactNode }) {
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

      <section className="panel-card coming">
        <h3>Carousel + stories</h3>
        <p className="muted small">Turn this reel into a carousel and stories in your style. Coming next.</p>
      </section>

      <BusinessCard brand={brand} onBrand={updateBrand} />
    </>
  );
}
