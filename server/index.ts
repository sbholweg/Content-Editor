import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import multer from "multer";
import { normalizeBrand, normalizeStyle } from "../src/shared/brand.ts";
import { isFiller } from "../src/shared/words.ts";
import type { BrandKit, Overlay, Project, Word } from "../src/shared/types.ts";
import { accessToken, checkPassword, requireAuth } from "./auth.ts";
import { config } from "./config.ts";
import { writeCaption } from "./caption.ts";
import { planEdit } from "./highlights.ts";
import { extractAudio, normalizeVideo, probe } from "./media.ts";
import { queueRender } from "./render.ts";
import { ensureWhisper } from "./setup-whisper.ts";
import {
  deleteProject, ensureDirs, listProjects, projectDir, projectFile, projectsDir,
  readBrand, readProject, updateProject, writeBrand, writeProject,
} from "./storage.ts";
import { transcribeWords } from "./transcribe.ts";
import { createTrialReels } from "./trials.ts";
import { addAsset, deleteAsset, libraryDir, listAssets } from "./library.ts";

await ensureDirs();

const app = express();
app.use(express.json({ limit: "5mb" }));

// Allow the editor to be embedded in an iframe on your own website.
app.use((_req, res, next) => {
  const ancestors = process.env.EMBED_ALLOWED_ORIGINS ?? "*";
  res.setHeader("Content-Security-Policy", `frame-ancestors ${ancestors}`);
  next();
});

app.post("/api/login", (req, res) => {
  if (!checkPassword(String(req.body?.password ?? ""))) return res.status(401).json({ error: "Wrong password" });
  res.json({ token: accessToken });
});
app.get("/api/auth-required", (_req, res) => res.json({ required: Boolean(accessToken) }));

app.use(["/api", "/media"], requireAuth);

// The exporter loads GIFs with fetch() from its own local address, which counts as another
// origin. Media still needs the access token, so allowing any origin here is safe.
app.use("/media", (_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(config.dataDir, "uploads"),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(file.originalname)),
});
await fs.mkdir(path.join(config.dataDir, "uploads"), { recursive: true });

app.post("/api/projects", upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Please choose a video file" });
  const id = crypto.randomUUID();
  await fs.mkdir(projectDir(id), { recursive: true });
  const original = projectFile(id, `original${path.extname(req.file.originalname) || ".mp4"}`);
  await fs.rename(req.file.path, original);

  const project: Project = {
    id,
    createdAt: new Date().toISOString(),
    originalName: req.file.originalname,
    status: "processing",
    step: "Preparing video",
    durationMs: 0,
    hookText: "",
    postCaption: "",
    removePauses: true,
    width: 0,
    height: 0,
    words: [],
    overlays: [],
    style: (await readBrand()).defaultStyle,
    render: { status: "idle", progress: 0 },
  };
  await writeProject(project);
  res.json(project);
  void processProject(id, original, req.body?.autopilot === "1");
});

// With autopilot ("Do it for me"), the reel is also cleaned up, captioned and exported
// without the creator having to touch anything.
async function processProject(id: string, original: string, autopilot: boolean) {
  try {
    const video = projectFile(id, "video.mp4");
    const audio = projectFile(id, "audio.wav");
    await normalizeVideo(original, video);
    const info = await probe(video);
    await updateProject(id, { ...info, step: "Listening to your video" });
    await extractAudio(video, audio);
    const words = await transcribeWords(audio);
    await updateProject(id, { words, step: "Picking words to highlight" });
    const brand = await readBrand();
    const plan = await planEdit(words, brand.business);
    if (!autopilot) {
      await updateProject(id, { words: plan.words, hookText: plan.hook, status: "ready", step: undefined });
    } else {
      const cleaned = plan.words.map((w) => (isFiller(w.text) ? { ...w, cut: true } : w));
      await updateProject(id, { words: cleaned, hookText: plan.hook, removePauses: true, step: "Writing your caption" });
      const postCaption = await writeCaption({ words: cleaned, hook: plan.hook, business: brand.business, cta: "" }).catch(() => "");
      await updateProject(id, { postCaption, status: "ready", step: undefined, render: { status: "rendering", progress: 0 } });
      queueRender(id);
    }
    await fs.rm(original, { force: true });
    await fs.rm(audio, { force: true });
  } catch (err) {
    console.error(`Processing failed for ${id}`, err);
    await updateProject(id, { status: "error", error: String(err), step: undefined });
  }
}

app.get("/api/projects", async (_req, res) => res.json(await listProjects()));

app.get("/api/projects/:id", async (req, res) => {
  const project = await readProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(project);
});

app.patch("/api/projects/:id", async (req, res) => {
  const project = await readProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  const patch: Partial<Project> = {};
  if (Array.isArray(req.body?.words)) patch.words = req.body.words as Word[];
  if (typeof req.body?.hookText === "string") patch.hookText = req.body.hookText.slice(0, 200);
  if (typeof req.body?.removePauses === "boolean") patch.removePauses = req.body.removePauses;
  if (typeof req.body?.postCaption === "string") patch.postCaption = req.body.postCaption.slice(0, 2200);
  if (req.body?.style && typeof req.body.style === "object") patch.style = normalizeStyle(req.body.style);
  if (Array.isArray(req.body?.overlays)) patch.overlays = req.body.overlays as Overlay[];
  res.json(await updateProject(project.id, patch));
});

app.post("/api/projects/:id/auto-highlight", async (req, res) => {
  const project = await readProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  const plan = await planEdit(project.words, (await readBrand()).business);
  res.json(await updateProject(project.id, { words: plan.words, hookText: project.hookText || plan.hook }));
});

app.post("/api/projects/:id/caption", async (req, res) => {
  const project = await readProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  try {
    const caption = await writeCaption({
      words: project.words,
      hook: project.hookText,
      business: (await readBrand()).business,
      cta: String(req.body?.cta ?? ""),
    });
    res.json(await updateProject(project.id, { postCaption: caption.slice(0, 2200) }));
  } catch (err) {
    console.error("Caption writing failed", err);
    res.status(502).json({ error: "Couldn't write a caption right now. Please try again." });
  }
});

app.post("/api/projects/:id/trial-reels", async (req, res) => {
  const project = await readProject(req.params.id);
  if (!project || project.status !== "ready") return res.status(404).json({ error: "Not found" });
  res.json(await createTrialReels(project));
});

app.get("/api/projects/:id/trial-reels", async (req, res) => {
  res.json((await listProjects()).filter((p) => p.parentId === req.params.id));
});

app.delete("/api/projects/:id", async (req, res) => {
  await deleteProject(req.params.id);
  res.json({ ok: true });
});

app.post("/api/projects/:id/render", async (req, res) => {
  const project = await readProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (project.render.status === "rendering") return res.json(project);
  const next = await updateProject(project.id, { render: { status: "rendering", progress: 0 } });
  queueRender(project.id);
  res.json(next);
});

app.get("/api/brand", async (_req, res) => res.json(await readBrand()));
app.put("/api/brand", async (req, res) => {
  const brand = normalizeBrand({ ...(await readBrand()), ...(req.body as Partial<BrandKit>) });
  await writeBrand(brand);
  res.json(brand);
});

app.get("/api/library", async (_req, res) => res.json(await listAssets()));

const libraryUpload = multer({
  dest: path.join(config.dataDir, "uploads"),
  limits: { fileSize: 1024 * 1024 * 1024 },
});
app.post("/api/library", libraryUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Please choose a file" });
  try {
    res.json(await addAsset(req.file));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete("/api/library/:id", async (req, res) => {
  await deleteAsset(req.params.id);
  res.json({ ok: true });
});

app.get("/media/library/:file", async (req, res) => {
  const asset = (await listAssets()).find((a) => a.file === req.params.file || a.thumb === req.params.file);
  if (!asset) return res.status(404).end();
  res.sendFile(path.join(libraryDir, req.params.file));
});

// Serves the prepared video and the finished export.
app.get("/media/:id/:file", async (req, res) => {
  const { id, file } = req.params;
  if (!(await readProject(id)) || !["video.mp4", "export.mp4"].includes(file)) return res.status(404).end();
  if (file === "export.mp4") res.attachment("reel.mp4");
  res.sendFile(projectFile(id, file));
});

// In production the built web app is served from the same server.
const distDir = path.join(config.root, "dist");
if (await fs.stat(distDir).catch(() => null)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/(api|media)\/).*/, (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

// Resume anything interrupted by a restart.
for (const p of await listProjects()) {
  if (p.status === "processing") await updateProject(p.id, { status: "error", error: "Server restarted while processing. Please upload again." });
  if (p.render.status === "rendering") await updateProject(p.id, { render: { status: "idle", progress: 0 } });
}

app.listen(config.port, () => {
  console.log(`Content Editor running on http://localhost:${config.port}`);
  console.log(`Data folder: ${projectsDir}`);
});

// Build whisper.cpp in the background on first boot if it isn't there yet.
ensureWhisper().catch((err) => console.error("whisper.cpp setup failed:", err));
