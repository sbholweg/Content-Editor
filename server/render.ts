import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { ReelProps } from "../src/shared/types.ts";
import { accessToken } from "./auth.ts";
import { config } from "./config.ts";
import { projectFile, readBrand, readProject, updateProject } from "./storage.ts";

let bundlePromise: Promise<string> | null = null;

function getBundle() {
  bundlePromise ??= bundle({ entryPoint: path.join(config.root, "src/remotion/index.tsx") });
  return bundlePromise;
}

// Renders run one at a time so a small server doesn't run out of memory.
let queue: Promise<void> = Promise.resolve();

export function queueRender(id: string) {
  queue = queue.then(() => renderProject(id)).catch((err) => console.error(err));
}

async function renderProject(id: string) {
  const project = await readProject(id);
  if (!project) return;
  try {
    const serveUrl = await getBundle();
    const tokenParam = accessToken ? `?t=${accessToken}` : "";
    const inputProps: ReelProps = {
      videoSrc: `http://127.0.0.1:${config.port}/media/${id}/video.mp4${tokenParam}`,
      words: project.words,
      brand: await readBrand(),
      durationMs: project.durationMs,
    };
    const browserExecutable = process.env.REMOTION_BROWSER || null;
    const composition = await selectComposition({ serveUrl, id: "Reel", inputProps, browserExecutable });

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
  } catch (err) {
    console.error(`Render failed for ${id}`, err);
    await updateProject(id, { render: { status: "error", progress: 0, error: String(err) } });
  }
}
