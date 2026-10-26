import { Thumbnail } from "@remotion/player";
import React, { useState } from "react";
import { Cover, COVER_SIZE } from "../../remotion/Cover";
import { toOriginalMs } from "../../shared/timeline";
import type { CoverDesign, CoverProps, Project } from "../../shared/types";
import { PostCaptionCard } from "../sections";
import { TrialReelsCard } from "../TrialReels";
import { api, libraryUrl, projectFileUrl } from "../api";
import { formatTime, useEditor } from "./context";
import { RepurposeCard } from "./Repurpose";

const DESIGNS: { value: CoverDesign; label: string }[] = [
  { value: "headline", label: "Headline" },
  { value: "block", label: "Color block" },
  { value: "split", label: "Split" },
  { value: "plain", label: "Just the frame" },
];

// The cover image for a reel in the grid: the branded cover if there is one, otherwise the frame.
export function coverUrl(p: Project) {
  if (p.cover?.madeAt) return projectFileUrl(p.id, "cover.png", p.cover.madeAt);
  const ms = p.coverMs ?? p.words.find((w) => !w.cut)?.startMs ?? 500;
  return projectFileUrl(p.id, `frame-${Math.round(ms)}.jpg`);
}

// The branded cover: pick a frame from the preview, a design and the words, then save it as an image.
function CoverCard({ onProject }: { onProject: (p: Project) => void }) {
  const { project, reel, timeline, timeMs, assets, onAuthError, notify } = useEditor();
  const [coverMs, setCoverMs] = useState(project.coverMs ?? project.words.find((w) => !w.cut)?.startMs ?? 500);
  const [design, setDesign] = useState<CoverDesign>(project.cover?.design ?? "headline");
  const [title, setTitle] = useState(project.cover?.title ?? reel.hookText);
  const [sub, setSub] = useState(project.cover?.sub ?? "");
  const [busy, setBusy] = useState(false);
  const [words, setWords] = useState(false);
  const [grid, setGrid] = useState<Project[] | null>(null);
  const customFonts = assets.filter((a) => a.kind === "font").map((a) => ({ name: a.name, url: libraryUrl(a.file) }));
  const props: CoverProps = { background: projectFileUrl(project.id, `frame-${Math.round(coverMs)}.jpg`), title, sub, design, style: reel.style, customFonts };

  const make = async () => {
    setBusy(true);
    const p = await api.makeCover(project.id, { design, title, sub }).catch((err) => {
      onAuthError(err);
      notify(`Couldn't make the cover: ${(err as Error).message}`);
      return null;
    });
    setBusy(false);
    if (!p) return;
    onProject(p);
    notify("Cover saved. It goes in your outputs folder with the reel when you export.");
  };

  const showGrid = async () => {
    if (grid) return setGrid(null);
    const all = await api.listProjects().catch(onAuthError);
    if (all) setGrid([project, ...all.filter((p) => p.id !== project.id && p.status === "ready")].slice(0, 9));
  };

  return (
    <section className="panel-card">
      <div className="cover-row">
        <div className="cover-thumb branded">
          <Thumbnail component={Cover} inputProps={props} frameToDisplay={0} durationInFrames={1} fps={30} compositionWidth={COVER_SIZE.width} compositionHeight={COVER_SIZE.height} style={{ width: "100%", height: "100%" }} />
          <span className="grid-guide" title="What shows in your profile grid" />
        </div>
        <div className="stack tight grow">
          <h3>Cover</h3>
          <p className="muted small">Pause the preview on a frame you like, pick a design, save. The dashed box is what your grid shows.</p>
          <div className="row wrap">
            <button
              className="chip"
              onClick={async () => {
                const ms = Math.round(toOriginalMs(timeline.segments, timeMs, timeline.speed));
                setCoverMs(ms);
                await api.saveProject(project.id, { coverMs: ms }).catch(onAuthError);
              }}
            >
              📸 Use this frame
            </button>
            {DESIGNS.map((d) => (
              <button key={d.value} className={`chip ${design === d.value ? "accent" : ""}`} onClick={() => setDesign(d.value)}>
                {d.label}
              </button>
            ))}
          </div>
          {design === "plain" ? null : !words ? (
            <button className="link small left" onClick={() => setWords(true)}>✎ Change the words on the cover</button>
          ) : (
            <>
              <input value={title} placeholder="Words on the cover" onChange={(e) => setTitle(e.target.value)} aria-label="Cover words" />
              <input value={sub} placeholder="Small line (optional), e.g. part 2" onChange={(e) => setSub(e.target.value)} aria-label="Cover small line" />
              <p className="muted small">Put *stars* around a word to give it your accent style.</p>
            </>
          )}
          <div className="row wrap">
            <button className="btn primary small-btn" disabled={busy} onClick={make}>
              {busy ? "Making…" : "Save cover"}
            </button>
            {project.cover?.madeAt ? (
              <a className="chip" href={coverUrl(project)} download="cover.png">
                Download cover
              </a>
            ) : null}
            <button className="chip" onClick={showGrid}>{grid ? "Hide grid" : "▦ See it in my grid"}</button>
          </div>
        </div>
      </div>
      {grid ? <GridPreview projects={grid} highlight={project.id} /> : null}
    </section>
  );
}

// A profile grid mock-up: three across, each cover cropped to the middle 3:4 like the grid shows it.
export function GridPreview({ projects, highlight }: { projects: Project[]; highlight?: string }) {
  return (
    <div className="grid-preview">
      {projects.map((p) => (
        <div key={p.id} className={`grid-tile ${p.id === highlight ? "on" : ""}`}>
          <img src={coverUrl(p)} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
        </div>
      ))}
    </div>
  );
}

// Simple first: save the video, the caption and the cover. The extras are folded underneath.
export function FinishTab({ exportControls, onProject }: { exportControls: React.ReactNode; onProject: (p: Project) => void }) {
  const { project, reel, update, timeline, brand, updateBrand, onAuthError } = useEditor();
  const [more, setMore] = useState<"endcard" | "trials" | "repurpose" | null>(null);
  const extras: { id: NonNullable<typeof more>; title: string; hint: string; body: React.ReactNode; show: boolean }[] = [
    { id: "endcard", title: "End card", hint: reel.endCard?.on ? "on" : "a 2-second card with your call to action", body: <EndCardPanel />, show: true },
    {
      id: "trials",
      title: "Trial reels",
      hint: "3 short versions with different hooks, to test on non-followers",
      body: <TrialReelsCard projectId={project.id} onOpen={(id) => (window.location.hash = `#/p/${id}`)} onAuthError={onAuthError} />,
      show: !project.parentId,
    },
    { id: "repurpose", title: "Carousel & stories", hint: "turn this reel into slides", body: <RepurposeCard />, show: !project.parentId },
  ];
  return (
    <>
      <section className="panel-card">
        <header className="panel-head">
          <div>
            <h2>Finish</h2>
            <p className="muted small">Tap <strong>Save video</strong> to get it at full quality, ready to post.</p>
          </div>
          <span className="mono muted">{formatTime(timeline.durationMs)} long</span>
        </header>
        <div className="mobile-only">
          <div className="row wrap">{exportControls}</div>
        </div>
        {project.render.status === "error" ? <p className="error small">Export failed: {project.render.error}</p> : null}
        <label className="check small">
          <input
            type="checkbox"
            checked={Boolean(project.posted)}
            onChange={async () => {
              const p = await api.saveProject(project.id, { posted: !project.posted }).catch(onAuthError);
              if (p) onProject(p);
            }}
          />
          I've posted it (moves it to your Posted folder)
        </label>
      </section>

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

      <CoverCard onProject={onProject} />

      <section className="panel-card accordion">
        <div className="label">Make more from this reel (optional)</div>
        {extras.filter((x) => x.show).map((x) => (
          <div key={x.id} className={`acc ${more === x.id ? "open" : ""}`}>
            <button className="acc-head" onClick={() => setMore(more === x.id ? null : x.id)}>
              <span className="grow left">
                <strong>{x.title}</strong>
                <span className="muted small">{x.hint}</span>
              </span>
              <span className="acc-caret">{more === x.id ? "–" : "+"}</span>
            </button>
            {more === x.id ? <div className="acc-body">{x.body}</div> : null}
          </div>
        ))}
      </section>
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
