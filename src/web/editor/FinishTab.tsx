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
                const ms = Math.round(toOriginalMs(timeline.segments, timeMs, timeline.speed));
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

      <EndCardPanel />

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

// A short branded card after your last word, with your call to action (adds about 2 seconds).
function EndCardPanel() {
  const { reel, update, brand } = useEditor();
  const card = reel.endCard ?? { on: false, text: "", sub: "" };
  const set = (patch: Partial<typeof card>) => update({ endCard: { ...card, ...patch } });
  const suggestions = [...brand.ctaKeywords, brand.business.cta].filter((c, i, all) => c && all.indexOf(c) === i).slice(0, 4);
  return (
    <section className="panel-card">
      <div className="row">
        <div className="grow">
          <h3>End card</h3>
          <p className="muted small">A 2-second card in your brand after your last word, with your call to action.</p>
        </div>
        <button className={`chip ${card.on ? "accent" : ""}`} onClick={() => set({ on: !card.on, text: card.text || suggestions[0] || "" })} aria-pressed={card.on}>
          {card.on ? "✓ On" : "Add end card"}
        </button>
      </div>
      {card.on ? (
        <>
          <input value={card.text} maxLength={60} placeholder='Big line, e.g. Comment "EDIT"' onChange={(e) => set({ text: e.target.value })} aria-label="End card big line" />
          <input value={card.sub} maxLength={80} placeholder="Small line (optional), e.g. and I'll send you the guide" onChange={(e) => set({ sub: e.target.value })} aria-label="End card small line" />
          {suggestions.length ? (
            <div className="row">
              <span className="muted small">Your calls to action:</span>
              {suggestions.map((c) => (
                <button key={c} className="chip" onClick={() => set({ text: c.slice(0, 60) })}>{c.length > 30 ? `${c.slice(0, 30)}…` : c}</button>
              ))}
            </div>
          ) : null}
          {!card.text.trim() ? <p className="muted small">Add a big line to show the card.</p> : null}
        </>
      ) : null}
    </section>
  );
}
