import { cleanAudio } from "./media.ts";
import { projectFile, readProject, updateProject } from "./storage.ts";

const running = new Map<string, Promise<void>>();

// Makes the clean-audio copy of a reel's video once (in the background), and remembers it's ready.
export function ensureCleanAudio(id: string): Promise<void> {
  const already = running.get(id);
  if (already) return already;
  const job = (async () => {
    const project = await readProject(id);
    if (!project || project.cleanAudio === "ready" || project.kind === "broll") return;
    await updateProject(id, { cleanAudio: "working" });
    try {
      await cleanAudio(projectFile(id, "video.mp4"), projectFile(id, "video-clean.mp4"));
      await updateProject(id, { cleanAudio: "ready" });
    } catch (err) {
      console.error(`Clean audio failed for ${id}`, err);
      await updateProject(id, { cleanAudio: "error" });
    }
  })().finally(() => running.delete(id));
  running.set(id, job);
  return job;
}

// Which video file a reel plays from: the clean-audio copy when it's switched on and ready.
export const videoFileFor = (p: { style: { cleanAudio?: boolean }; cleanAudio?: string }) =>
  p.style.cleanAudio && p.cleanAudio === "ready" ? "video-clean.mp4" : "video.mp4";
