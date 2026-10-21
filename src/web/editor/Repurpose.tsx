import { Thumbnail } from "@remotion/player";
import React, { useState } from "react";
import { CAROUSEL_SIZE, SlideCard, STORY_SIZE } from "../../remotion/Slide";
import { isLineCut } from "../../shared/lines";
import type { Slide, SlideFormat, SlideProps } from "../../shared/types";
import { api, libraryUrl, projectFileUrl } from "../api";
import { Label, Options } from "../ui";
import { useEditor } from "./context";

// Turn the reel into a carousel and stories: draft, tweak each slide, then save the images.
export function RepurposeCard() {
  const { project, reel, update, lines, assets, onAuthError } = useEditor();
  const [format, setFormat] = useState<SlideFormat>("carousel");
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState<"" | "draft" | "render">("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const slides = reel[format];
  const slide = slides[Math.min(selected, slides.length - 1)];
  const size = format === "carousel" ? CAROUSEL_SIZE : STORY_SIZE;
  const customFonts = assets.filter((a) => a.kind === "font").map((a) => ({ name: a.name, url: libraryUrl(a.file) }));
  const keptLines = lines.filter((l) => !isLineCut(l));

  const setSlides = (next: Slide[]) => {
    setFiles([]);
    update({ [format]: next });
  };
  const setSlide = (patch: Partial<Slide>) => setSlides(slides.map((s) => (s.id === slide.id ? { ...s, ...patch } : s)));
  const propsFor = (s: Slide): SlideProps => ({
    slide: s,
    format,
    style: reel.style,
    background: projectFileUrl(project.id, `frame-${Math.round(s.frameMs)}.jpg`),
    customFonts,
  });

  const draft = async () => {
    setBusy("draft");
    try {
      const p = await api.draftSlides(project.id, format);
      update({ [format]: p[format] });
      setSelected(0);
      setFiles([]);
    } catch (err) {
      onAuthError(err);
    }
    setBusy("");
  };

  // Makes the images, then fetches them so "Save" can open the share sheet straight from a tap.
  const makeImages = async () => {
    setBusy("render");
    setError("");
    try {
      const { images } = await api.renderSlides(project.id, format);
      const stamp = String(Date.now());
      setFiles(
        await Promise.all(
          images.map(async (name) => new File([await (await fetch(projectFileUrl(project.id, name, stamp))).blob()], name, { type: "image/png" })),
        ),
      );
    } catch (err) {
      onAuthError(err);
      setError((err as Error).message);
    }
    setBusy("");
  };

  const save = async () => {
    if (navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    for (const f of files) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      a.click();
    }
  };

  return (
    <section className="panel-card">
      <header className="panel-head">
        <div>
          <h3>Repurpose this reel</h3>
          <p className="muted small">One reel, more posts: a carousel and stories in your style, made from your own words and footage.</p>
        </div>
      </header>
      <Options
        value={format}
        onChange={(f) => {
          setFormat(f);
          setSelected(0);
          setFiles([]);
        }}
        options={[
          { value: "carousel", label: "Carousel", note: `${reel.carousel.length || "no"} slides` },
          { value: "stories", label: "Stories", note: `${reel.stories.length || "no"} frames` },
        ]}
      />

      {!slides.length ? (
        <button className="btn primary" disabled={busy !== ""} onClick={draft}>
          {busy === "draft" ? "Writing…" : format === "carousel" ? "✨ Make a carousel" : "✨ Make stories"}
        </button>
      ) : (
        <>
          <div className="slide-strip">
            {slides.map((s, i) => (
              <button key={s.id} className={`slide-thumb ${s.id === slide.id ? "on" : ""} ${format}`} onClick={() => setSelected(i)}>
                <Thumbnail
                  component={SlideCard}
                  inputProps={propsFor(s)}
                  frameToDisplay={0}
                  durationInFrames={1}
                  fps={30}
                  compositionWidth={size.width}
                  compositionHeight={size.height}
                  style={{ width: "100%", height: "100%" }}
                />
                <span className="slide-num">{i + 1}</span>
              </button>
            ))}
            <button
              className={`slide-thumb add ${format}`}
              onClick={() => {
                const next: Slide = { id: `${format}-${Date.now()}`, kind: "point", eyebrow: "", title: "new point", body: "", pills: [], frameMs: slide?.frameMs ?? 0 };
                const at = slides.length - (slides.at(-1)?.kind === "cta" ? 1 : 0);
                setSlides([...slides.slice(0, at), next, ...slides.slice(at)]);
                setSelected(at);
              }}
            >
              ＋ Add
            </button>
          </div>

          {slide ? (
            <div className="slide-editor">
              <Label>Small line on top</Label>
              <input value={slide.eyebrow} placeholder="reason one: your" onChange={(e) => setSlide({ eyebrow: e.target.value })} />
              <Label>Big words</Label>
              <input className="hook-input" value={slide.title} onChange={(e) => setSlide({ title: e.target.value })} />
              <Label>Sentence underneath</Label>
              <textarea rows={2} value={slide.body} onChange={(e) => setSlide({ body: e.target.value })} />
              <Label>Tags (separate with commas)</Label>
              <input
                value={slide.pills.join(", ")}
                placeholder="loop the last line, tease part 2"
                onChange={(e) => setSlide({ pills: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
              />
              <Label>Background</Label>
              <select value={Math.round(slide.frameMs)} onChange={(e) => setSlide({ frameMs: Number(e.target.value) })}>
                {keptLines.map((l) => {
                  const ms = Math.round(l.words.find((w) => !w.cut)!.startMs);
                  return (
                    <option key={l.id} value={ms}>
                      Line {l.number}: {l.words.filter((w) => !w.cut).map((w) => w.text).join(" ").slice(0, 50)}
                    </option>
                  );
                })}
                {!keptLines.some((l) => Math.round(l.words.find((w) => !w.cut)!.startMs) === Math.round(slide.frameMs)) ? (
                  <option value={Math.round(slide.frameMs)}>Current frame</option>
                ) : null}
              </select>
              <div className="row">
                <button
                  className="link danger"
                  onClick={() => {
                    setSlides(slides.filter((s) => s.id !== slide.id));
                    setSelected(Math.max(0, selected - 1));
                  }}
                >
                  Remove this slide
                </button>
                <span className="grow" />
                <button className="link" onClick={draft} disabled={busy !== ""}>Start over</button>
              </div>
            </div>
          ) : null}

          <div className="row">
            {files.length ? (
              <>
                <button className="btn" onClick={makeImages} disabled={busy !== ""}>Make again</button>
                <button className="btn primary" onClick={save}>Save {files.length} images</button>
              </>
            ) : (
              <button className="btn primary" disabled={busy !== ""} onClick={makeImages}>
                {busy === "render" ? "Making images…" : "Make the images"}
              </button>
            )}
          </div>
          {error ? <p className="error small">{error}</p> : null}
          <p className="muted small">Tip: ask Claude “write my carousel for this reel” for punchier wording.</p>
        </>
      )}
    </section>
  );
}
