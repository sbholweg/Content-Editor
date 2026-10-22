import fs from "node:fs/promises";
import path from "node:path";
import { renderStill, selectComposition } from "@remotion/renderer";
import type { Project, SlideFormat, SlideProps } from "../src/shared/types.ts";
import { accessToken } from "./auth.ts";
import { config } from "./config.ts";
import { listAssets } from "./library.ts";
import { run } from "./media.ts";
import { getBundle } from "./render.ts";
import { projectFile, readBrand } from "./storage.ts";
import { slideColors } from "../src/shared/brand.ts";

// A still from the prepared video, used as a slide background (cached per moment).
export async function frameAt(id: string, ms: number) {
  const file = projectFile(id, `frame-${Math.round(ms)}.jpg`);
  if (!(await fs.stat(file).catch(() => null))) {
    await run("ffmpeg", ["-y", "-ss", String(Math.max(0, ms + 150) / 1000), "-i", projectFile(id, "video.mp4"), "-frames:v", "1", "-q:v", "3", file]);
  }
  return file;
}

export const imageName = (format: SlideFormat, i: number) => `${format === "carousel" ? "carousel" : "story"}-${String(i + 1).padStart(2, "0")}.png`;

// Renders every slide to a PNG in the reel's folder and copies them to the outputs folder.
export async function renderSlides(project: Project, format: SlideFormat): Promise<string[]> {
  const slides = project[format];
  const serveUrl = await getBundle();
  const tokenParam = accessToken ? `?t=${accessToken}` : "";
  const local = (route: string) => `http://127.0.0.1:${config.port}${route}${tokenParam}`;
  const assets = await listAssets();
  const customFonts = assets.filter((a) => a.kind === "font").map((a) => ({ name: a.name, url: local(`/media/library/${a.file}`) }));
  const colors = slideColors(await readBrand(), project.style);
  const design = project.slideDesign?.[format] ?? "photo";
  const browserExecutable = process.env.REMOTION_BROWSER || null;
  const compositionId = format === "carousel" ? "CarouselSlide" : "StoryFrame";

  const names: string[] = [];
  for (const [i, slide] of slides.entries()) {
    const photo = slide.bgAssetId ? assets.find((a) => a.id === slide.bgAssetId) : undefined;
    if (!photo) await frameAt(project.id, slide.frameMs);
    const inputProps: SlideProps = {
      slide,
      format,
      style: project.style,
      design,
      colors,
      background: photo ? local(`/media/library/${photo.file}`) : local(`/media/${project.id}/frame-${Math.round(slide.frameMs)}.jpg`),
      customFonts,
    };
    const composition = await selectComposition({ serveUrl, id: compositionId, inputProps, browserExecutable });
    const name = imageName(format, i);
    await renderStill({ serveUrl, composition, inputProps, output: projectFile(project.id, name), imageFormat: "png", browserExecutable });
    names.push(name);
  }

  // Remove images left over from a longer earlier version.
  for (const f of await fs.readdir(projectFile(project.id, "."))) {
    if (f.startsWith(format === "carousel" ? "carousel-" : "story-") && !names.includes(f)) await fs.rm(projectFile(project.id, f));
  }

  const slug = (project.hookText || project.originalName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "reel";
  const dir = path.join(config.outputsDir, `${project.createdAt.slice(0, 10)}-${slug}-${format}-${project.id.slice(0, 6)}`);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  for (const n of names) await fs.copyFile(projectFile(project.id, n), path.join(dir, n));
  return names;
}
