import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import multer from "multer";
import { z } from "zod";
import { autoSounds } from "../src/shared/autoSounds.ts";
import { normalizeBrand, normalizeStyle } from "../src/shared/brand.ts";
import { applyEdits, ReelEdits } from "../src/shared/edits.ts";
import { draftSlides } from "../src/shared/repurpose.ts";
import type { BrandKit, MusicBed, Overlay, Project, ReelNote, Slide, SlideFormat, SoundCue, Word } from "../src/shared/types.ts";
import { tighten } from "../src/shared/words.ts";
import { accessToken, checkPassword, requireAuth } from "./auth.ts";
import { writeCaption } from "./caption.ts";
import { claudeSource } from "./claude-cli.ts";
import { config } from "./config.ts";
import { subscribe } from "./events.ts";
import { planEdit } from "./highlights.ts";
import { smartCut } from "./smartcut.ts";
import { phoneLinks } from "./phone.ts";
import { colorStats, detectSilences, extractAudio, normalizeVideo, probe } from "./media.ts";
import { queueRender } from "./render.ts";
import { ensureWhisper } from "./setup-whisper.ts";
import {
  deleteProject, ensureDirs, listProjects, projectDir, projectFile, projectsDir,
  readBrand, readProject, updateProject, writeBrand, writeProject,
} from "./storage.ts";
import { addAsset, deleteAsset, libraryDir, listAssets, syncBrollFolder } from "./library.ts";
import { transcribeWords } from "./transcribe.ts";
import { frameAt, renderSlides } from "./repurpose.ts";
import { createTrialReels, NoBrollError } from "./trials.ts";
import { BrandAnswersSchema, generateBrand } from "./brand-gen.ts";

await ensureDirs();

const app = express();
app.use(express.json({ limit: "5mb" }));

// Allow the editor to be embedded in an iframe on your own website.
app.use((_req, res, next) => {
  const ancestors = process.env.EMBED_ALLOWED_ORIGINS ?? "*";
  res.setHeader("Content-Security-Policy", `frame-ancestors ${ancestors}`);
  next();
});

// Built-in sound effects (not private, so no password needed).
app.use("/sfx", (_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}, express.static(path.join(config.root, "public", "sfx")));

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
  res.json(await createProject(req.file.originalname, req.body?.autopilot === "1", (dest) => fs.rename(req.file!.path, dest)));
});

// Used by the engine commands: brings in a clip already on this computer (e.g. from the inbox
// folder). The file is copied, never moved or changed.
app.post("/api/import", async (req, res) => {
  const source = String(req.body?.path ?? "");
  if (!/\.(mov|mp4|m4v|webm)$/i.test(source)) return res.status(400).json({ error: "Only .mov, .mp4, .m4v or .webm videos can be imported." });
  if (!(await fs.stat(source).catch(() => null))?.isFile()) return res.status(404).json({ error: `File not found: ${source}` });
  res.json(await createProject(path.basename(source), req.body?.autopilot === true, (dest) => fs.copyFile(source, dest)));
});

async function createProject(originalName: string, autopilot: boolean, placeOriginal: (dest: string) => Promise<void>) {
  const id = crypto.randomUUID();
  await fs.mkdir(projectDir(id), { recursive: true });
  const original = projectFile(id, `original${path.extname(originalName) || ".mp4"}`);
  await placeOriginal(original);

  const project: Project = {
    id,
    createdAt: new Date().toISOString(),
    originalName,
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
    hookSubText: "",
    sounds: [],
    music: null,
    soundsEnabled: true,
    carousel: [],
    stories: [],
    style: (await readBrand()).defaultStyle,
    render: { status: "idle", progress: 0 },
  };
  await writeProject(project);
  void processProject(id, original, autopilot);
  return project;
}

// With autopilot ("Do it for me"), the reel is also cleaned up, captioned and exported
// without the creator having to touch anything.
async function processProject(id: string, original: string, autopilot: boolean) {
  try {
    const video = projectFile(id, "video.mp4");
    const audio = projectFile(id, "audio.wav");
    await normalizeVideo(original, video);
    const info = await probe(video);
    const color = await colorStats(video).catch(() => undefined);
    await updateProject(id, { ...info, colorStats: color, step: "Listening to your video" });
    await extractAudio(video, audio);
    const silences = await detectSilences(audio).catch(() => []);
    const words = await transcribeWords(audio);
    await updateProject(id, { words, silences, step: "Reading it like an editor" });
    // Every reel starts tightly edited: Claude cuts flubs, restarts and repeats, then the
    // built-in rules catch any ums and repeats left, and pauses are trimmed from the audio.
    const edited = await smartCut(words);
    await updateProject(id, { step: "Cutting pauses and retakes" });
    const brand = await readBrand();
    const plan = await planEdit(tighten(edited.words), { ...brand.business, voice: brand.voice });
    const cleaned = plan.words;
    if (!autopilot) {
      await updateProject(id, { words: cleaned, hookText: plan.hook, removePauses: true, status: "ready", step: undefined });
    } else {
      await updateProject(id, { words: cleaned, hookText: plan.hook, removePauses: true, step: "Writing your caption" });
      const postCaption = await writeCaption({ words: cleaned, hook: plan.hook, business: { ...brand.business, voice: brand.voice }, cta: "" }).catch(() => "");
      const sounds = autoSounds({ words: cleaned, overlays: [], sounds: [], hookText: plan.hook }, []);
      await updateProject(id, { postCaption, sounds, status: "ready", step: undefined, render: { status: "rendering", progress: 0 } });
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
  if (typeof req.body?.hookSubText === "string") patch.hookSubText = req.body.hookSubText.slice(0, 200);
  if (Array.isArray(req.body?.sounds)) patch.sounds = req.body.sounds as SoundCue[];
  if (req.body && "music" in req.body) patch.music = req.body.music as MusicBed | null;
  if (typeof req.body?.soundsEnabled === "boolean") patch.soundsEnabled = req.body.soundsEnabled;
  if (typeof req.body?.posted === "boolean") patch.posted = req.body.posted;
  if (Array.isArray(req.body?.notes)) {
    patch.notes = (req.body.notes as ReelNote[])
      .filter((n) => n && typeof n.text === "string" && typeof n.atMs === "number")
      .map((n) => ({ id: String(n.id), atMs: Math.max(0, Math.round(n.atMs)), text: n.text.slice(0, 500) }))
      .slice(0, 50);
  }
  if (typeof req.body?.coverMs === "number") patch.coverMs = Math.max(0, Math.round(req.body.coverMs));
  if (req.body?.broll && Array.isArray(req.body.broll.clipIds)) patch.broll = { clipIds: req.body.broll.clipIds, lengthMs: Number(req.body.broll.lengthMs) || 7000 };
  // On b-roll trial reels (which have no in-editor "export again" state), a change to what's in
  // the video means the last export is out of date.
  if (project.kind === "broll" && project.render.status === "done" && Object.keys(patch).some((k) => k !== "posted" && k !== "postCaption")) {
    patch.render = { status: "idle", progress: 0 };
  }
  if (Array.isArray(req.body?.carousel)) patch.carousel = req.body.carousel as Slide[];
  if (Array.isArray(req.body?.stories)) patch.stories = req.body.stories as Slide[];
  if (req.body?.slideDesign && typeof req.body.slideDesign === "object") patch.slideDesign = req.body.slideDesign;
  res.json(await updateProject(project.id, patch));
});

app.post("/api/projects/:id/apply", async (req, res) => {
  const parsed = ReelEdits.safeParse(req.body?.edits ?? req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  if (!(await readProject(req.params.id))) return res.status(404).json({ error: "Not found" });
  try {
    const [brand, library] = await Promise.all([readBrand(), listAssets()]);
    res.json(await updateProject(req.params.id, (p) => applyEdits(p, parsed.data, brand, library)));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get("/api/events", subscribe);

// Which writer the ✨ buttons use: an API key, the person's Claude Code, or simple rules.
// Measures a reel's average color for grading (reels made before grading existed don't have it).
app.post("/api/projects/:id/color-stats", async (req, res) => {
  const project = await readProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (project.colorStats) return res.json(project);
  const stats = await colorStats(projectFile(project.id, "video.mp4"));
  res.json(await updateProject(project.id, { colorStats: stats }));
});

app.get("/api/ai-status", (_req, res) => res.json({ source: claudeSource() }));

// Links a phone on the same Wi-Fi can use to open the editor. The token lets the QR code log
// the phone straight in (it's only ever shown on this computer's screen, to someone already in).
app.get("/api/phone-link", (_req, res) => res.json({ links: phoneLinks(config.port), token: accessToken ?? "" }));

// Tighten an existing reel: detect the quiet parts of its audio (older reels don't have this
// yet) and cut ums, repeats and restarted sentences.
app.post("/api/projects/:id/tighten", async (req, res) => {
  const project = await readProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  // Always listen again: reels made before the pause detector improved have stale (or no) pauses.
  const silences = await detectSilences(projectFile(project.id, "video.mp4")).catch(() => project.silences ?? []);
  // Claude reads it like an editor (flubs, restarts, repeats), then the built-in rules run.
  const edited = await smartCut(project.words);
  const updated = await updateProject(project.id, (p) => {
    const editedById = new Map(edited.words.map((w) => [w.id, w]));
    const words = p.words.map((w) => (editedById.get(w.id)?.cut ? { ...w, cut: true } : w));
    return { silences, removePauses: true, words: tighten(words) };
  });
  res.json({ ...updated, smartCut: edited.by, smartCutWords: edited.cut });
});

// Carousel slides and story frames: draft them from the reel, then render to images.
const FORMATS: SlideFormat[] = ["carousel", "stories"];
app.post("/api/projects/:id/:format/draft", async (req, res) => {
  const format = req.params.format as SlideFormat;
  const project = await readProject(req.params.id);
  if (!project || !FORMATS.includes(format)) return res.status(404).json({ error: "Not found" });
  const slides = Array.isArray(req.body?.slides) ? (req.body.slides as Slide[]) : draftSlides(project, await readBrand(), format);
  res.json(await updateProject(project.id, { [format]: slides }));
});

app.post("/api/projects/:id/:format/render", async (req, res) => {
  const format = req.params.format as SlideFormat;
  const project = await readProject(req.params.id);
  if (!project || !FORMATS.includes(format)) return res.status(404).json({ error: "Not found" });
  if (!project[format].length) return res.status(400).json({ error: "Make the slides first." });
  try {
    res.json({ images: await renderSlides(project, format) });
  } catch (err) {
    console.error(`Rendering ${format} failed`, err);
    res.status(500).json({ error: `Couldn't make the images: ${(err as Error).message}` });
  }
});

app.post("/api/projects/:id/auto-highlight", async (req, res) => {
  const project = await readProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  const brand = await readBrand();
  const plan = await planEdit(project.words, { ...brand.business, voice: brand.voice });
  res.json(await updateProject(project.id, { words: plan.words, hookText: project.hookText || plan.hook }));
});

app.post("/api/projects/:id/caption", async (req, res) => {
  const project = await readProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  try {
    const caption = await writeCaption({
      words: project.words,
      hook: project.hookText,
      business: await readBrand().then((b) => ({ ...b.business, voice: b.voice })),
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
  try {
    res.json(await createTrialReels(project));
  } catch (err) {
    if (err instanceof NoBrollError) return res.status(400).json({ error: err.message });
    throw err;
  }
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

// Builds a whole brand from the inspiration board and answers (needs Claude: an API key or Claude Code).
app.post("/api/brand/generate", async (req, res) => {
  const parsed = BrandAnswersSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const brand = await generateBrand(await readBrand(), parsed.data);
  if (!brand) return res.status(503).json({ error: "Claude isn't available right now, so we used your images' colors instead. Ask Claude in chat: “build my brand from my inspiration board”." });
  await writeBrand(brand);
  res.json(brand);
});
app.put("/api/brand", async (req, res) => {
  const brand = normalizeBrand({ ...(await readBrand()), ...(req.body as Partial<BrandKit>) });
  await writeBrand(brand);
  res.json(brand);
});

app.get("/api/library", async (_req, res) => {
  await syncBrollFolder().catch(() => 0);
  res.json(await listAssets());
});

const libraryUpload = multer({
  dest: path.join(config.dataDir, "uploads"),
  limits: { fileSize: 1024 * 1024 * 1024 },
});
app.post("/api/library", libraryUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Please choose a file" });
  try {
    res.json(await addAsset({ ...req.file, collection: req.body?.collection === "inspo" ? "inspo" : undefined }));
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
  const allowed = ["video.mp4", "export.mp4"].includes(file) || /^(carousel|story)-\d{2}\.png$|^frame-\d+\.jpg$/.test(file);
  if (!(await readProject(id)) || !allowed) return res.status(404).end();
  if (file.startsWith("frame-")) await frameAt(id, Number(file.slice(6, -4))).catch(() => {});
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
  const phone = phoneLinks(config.port)[0];
  if (phone) console.log(`On your phone (same Wi-Fi): ${phone}`);
  console.log(`Data folder: ${projectsDir}`);
});

// Build whisper.cpp in the background on first boot if it isn't there yet.
ensureWhisper().catch((err) => console.error("whisper.cpp setup failed:", err));
