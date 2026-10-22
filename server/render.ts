import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { brollProps, reelProps } from "../src/shared/props.ts";
import type { BrollReelProps, ReelProps } from "../src/shared/types.ts";
import { accessToken } from "./auth.ts";
import { config } from "./config.ts";
import { listAssets } from "./library.ts";
import { frameAt } from "./repurpose.ts";
import { projectFile, readBrand, readProject, updateProject } from "./storage.ts";

let bundlePromise: Promise<string> | null = null;

export function getBundle() {
  bundlePromise ??= bundle({ entryPoint: path.join(config.root, "src/remotion/index.tsx") });
  return bundlePromise;
}

// Renders run one at a time so a small server doesn't run out of memory.
let queue: Promise<void> = Promise.resolve();

export function queueRender(id: string) {
  queue = queue.then(() => renderProject(id)).catch((err) => console.error(err));
}

// Puts a copy of the finished reel, named after its hook, plus its post caption in the outputs folder.
async function copyToOutputs(id: string) {
  const project = await readProject(id);
  if (!project) return;
  const slug = (project.hookText || project.originalName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "reel";
  const label = project.variantLabel ? `-trial-${project.variantLabel.toLowerCase().replace(/[^a-z]+/g, "-")}` : "";
  const base = path.join(config.outputsDir, `${project.createdAt.slice(0, 10)}-${slug}${label}-${id.slice(0, 6)}`);
  await fs.mkdir(config.outputsDir, { recursive: true });
  await fs.copyFile(projectFile(id, "export.mp4"), `${base}.mp4`);
  if (project.postCaption) await fs.writeFile(`${base}-caption.txt`, project.postCaption);
  if (project.coverMs !== undefined && project.kind !== "broll") {
    await fs.copyFile(await frameAt(id, project.coverMs), `${base}-cover.jpg`).catch(() => {});
  }
}

async function renderProject(id: string) {
  const project = await readProject(id);
  if (!project) return;
  try {
    const serveUrl = await getBundle();
    const tokenParam = accessToken ? `?t=${accessToken}` : "";
    const local = (route: string) => `http://127.0.0.1:${config.port}${route}${tokenParam}`;
    const assets = await listAssets();
    const urls = { video: local(`/media/${id}/video.mp4`), library: (file: string) => local(`/media/library/${file}`), sfx: (file: string) => local(`/sfx/${file}`) };
    const broll = project.kind === "broll";
    const inputProps: ReelProps | BrollReelProps = broll ? brollProps(project, assets, urls) : reelProps(project, assets, urls, (await readBrand()).logoAssetId);
    const browserExecutable = process.env.REMOTION_BROWSER || null;
    const composition = await selectComposition({ serveUrl, id: broll ? "BrollReel" : "Reel", inputProps, browserExecutable });

    let lastSaved = 0;
    let writes: Promise<unknown> = Promise.resolve();
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      inputProps,
      browserExecutable,
      outputLocation: projectFile(id, "export.mp4"),
      onProgress: ({ progress }) => {
        if (progress - lastSaved >= 0.05) {
          lastSaved = progress;
          writes = writes.then(() => updateProject(id, { render: { status: "rendering", progress } }));
        }
      },
    });
    await writes;
    await updateProject(id, { render: { status: "done", progress: 1 } });
    await copyToOutputs(id).catch((err) => console.error("Couldn't copy to the outputs folder:", err));
  } catch (err) {
    console.error(`Render failed for ${id}`, err);
    await updateProject(id, { render: { status: "error", progress: 0, error: String(err) } });
  }
}
