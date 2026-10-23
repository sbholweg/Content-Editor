// Engine commands, run as `npm run engine -- <command>`. Claude uses these to edit reels;
// they talk to the editor server, so any open editor updates live.
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../server/config.ts";
import { BUILTIN_SOUNDS } from "../src/shared/sounds.ts";
import { buildTimeline } from "../src/shared/timeline.ts";
import type { Asset, BrandKit, Project } from "../src/shared/types.ts";

const base = `http://127.0.0.1:${config.port}`;
let token = "";

async function call<T>(method: string, route: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(base + route, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    fail(`The editor isn't running. Start it with "npm run local" (leave it running), then try again.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) fail(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function login() {
  if (!config.appPassword) return;
  token = (await call<{ token: string }>("POST", "/api/login", { password: config.appPassword })).token;
}

async function resolveId(arg: string | undefined): Promise<string> {
  const projects = await call<Project[]>("GET", "/api/projects");
  if (!arg || arg === "latest") {
    const latest = projects.find((p) => !p.parentId);
    if (!latest) fail("There are no reels yet. Put a clip in the inbox folder and run: npm run engine -- import");
    return latest.id;
  }
  const match = projects.filter((p) => p.id.startsWith(arg));
  if (match.length !== 1) fail(match.length ? `"${arg}" matches more than one reel; use more characters.` : `No reel with id "${arg}". Run: npm run engine -- list`);
  return match[0].id;
}

const fmt = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const editorUrl = (id: string) => `http://localhost:${config.port}/#/p/${id}`;

async function waitFor(id: string, done: (p: Project) => boolean, label: string): Promise<Project> {
  let last = "";
  for (;;) {
    const p = await call<Project>("GET", `/api/projects/${id}`);
    if (p.status === "error") fail(`${p.originalName}: ${p.error}`);
    if (p.render.status === "error") fail(`Export failed: ${p.render.error}`);
    if (done(p)) return p;
    const now = p.status === "processing" ? `${label}: ${p.step ?? "working"}…` : `${label}: exporting ${Math.round(p.render.progress * 100)}%`;
    if (now !== last) console.log(now);
    last = now;
    await sleep(2000);
  }
}

function describe(p: Project, assets: Asset[]) {
  const timeline = buildTimeline(p.words, p.durationMs, p.removePauses, p.silences, p.style.speed);
  const s = p.style;
  const lines = [
    `Reel ${p.id}${p.variantLabel ? ` (trial reel: ${p.variantLabel})` : ""}`,
    `  Open in the editor: ${editorUrl(p.id)}`,
    `  From: ${p.originalName} · status ${p.status} · ${fmt(timeline.durationMs)} after cuts (${fmt(p.durationMs)} raw) · pauses ${p.removePauses ? "removed" : "kept"} · export ${p.render.status}`,
    `  Hook: ${p.hookText ? `"${p.hookText}"` : "(none)"}${p.hookSubText ? ` + "${p.hookSubText}"` : ""} · ${s.hookLayout} · ${s.displayFont} ${s.hookColor} at ${s.hookPosition}, ${s.hookDurationMs ? `${s.hookDurationMs / 1000}s` : "whole video"}`,
    `  Captions: ${s.captionsOn === false ? "OFF" : s.captionMode === "single" ? "one word at a time" : `${s.captionMode === "karaoke" ? "karaoke" : "phrase"}, ${s.wordsPerLine} words`} · ${s.font} ${s.fontSize}px ${s.textColor} · ${s.textEffect} · at ${s.position}${s.uppercase ? " · ALL CAPS" : ""}${s.zoomJumps ? " · zoom jumps" : ""}${s.logo && s.logo !== "off" ? ` · logo ${s.logo}` : ""}`,
    `  Key words: ${s.style === "pill" ? `bubble ${s.highlightColor} with ${s.highlightTextColor} text` : s.style === "color" ? `coloured text ${s.highlightColor}` : `serif word ${s.highlightColor}`}`,
    "",
    "  Words ([n] = word number, *word* = key word, ~word~ = cut):",
  ];
  let line = "  ";
  p.words.forEach((w, i) => {
    let t = w.text;
    if (w.highlight) t = `*${t}*`;
    if (w.cut) t = `~${t}~`;
    const piece = `[${i}]${w.emoji ? w.emoji : ""}${t} `;
    if (line.length + piece.length > 100) {
      lines.push(line.trimEnd());
      line = "  ";
    }
    line += piece;
  });
  if (line.trim()) lines.push(line.trimEnd());
  const index = new Map(p.words.map((w, i) => [w.id, i]));
  if (p.overlays.length) {
    lines.push("", "  Media:");
    for (const o of p.overlays) {
      const a = assets.find((x) => x.id === o.assetId);
      lines.push(`  - ${o.id}: ${a ? `${a.name} (${a.kind})` : "missing"} · ${o.placement} · words [${index.get(o.startWordId)}]-[${index.get(o.endWordId)}]`);
    }
  }
  if (p.music || p.sounds.length) {
    const soundName = (id: string) => BUILTIN_SOUNDS.find((b) => b.id === id)?.name ?? assets.find((a) => a.id === id)?.name ?? "missing";
    lines.push("", `  Sound${p.soundsEnabled ? "" : " (effects switched off)"}:`);
    if (p.music) lines.push(`  - music: ${soundName(p.music.soundId)} · volume ${p.music.volume}${p.music.duck ? " · quieter while talking" : ""}${p.music.enabled ? "" : " · off"}`);
    for (const c of p.sounds) lines.push(`  - ${c.id}: ${soundName(c.soundId)} on word [${index.get(c.wordId)}]`);
  }
  if (p.notes?.length) {
    lines.push("", "  Notes on the draft (the creator's requests; apply them, then send \"clearNotes\": true):");
    for (const n of p.notes) {
      // The word playing at that moment of the finished reel.
      const at = timeline.words.find((w) => n.atMs < w.endMs) ?? timeline.words.at(-1);
      lines.push(`  - at ${fmt(n.atMs)}${at ? ` (around word [${index.get(at.id)}] "${at.text}")` : ""}: ${n.text}`);
    }
  }
  lines.push("", `  Post caption: ${p.postCaption ? `\n    ${p.postCaption.replace(/\n/g, "\n    ")}` : "(none yet)"}`);
  return lines.join("\n");
}

async function readEdits(arg: string | undefined) {
  let text: string;
  if (!arg || arg === "-") {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    text = Buffer.concat(chunks).toString("utf8");
  } else if (arg.trim().startsWith("{")) {
    text = arg;
  } else {
    text = await fs.readFile(arg, "utf8");
  }
  try {
    return JSON.parse(text);
  } catch {
    fail("The edits must be valid JSON.");
  }
}

async function repurpose(format: "carousel" | "stories", args: string[]) {
  const id = await resolveId(args[0]);
  // The file can be a list of slides, or {"design": "photo|framed|clean|bold", "slides": [...]}.
  const file = args[1] ? await readEdits(args[1]) : null;
  const body = file ? { slides: Array.isArray(file) ? file : file.slides } : {};
  if (file && !Array.isArray(file) && file.design) {
    const current = await call<Project>("GET", `/api/projects/${id}`);
    await call("PATCH", `/api/projects/${id}`, { slideDesign: { ...current.slideDesign, [format]: file.design } });
  }
  const p = await call<Project>("POST", `/api/projects/${id}/${format}/draft`, body);
  console.log(`${format === "carousel" ? "Carousel" : "Stories"} for ${p.id.slice(0, 8)}:`);
  for (const [i, s] of p[format].entries()) {
    console.log(`  ${i + 1}. [${s.kind}] ${s.eyebrow ? `${s.eyebrow} / ` : ""}${s.title}${s.body ? ` / ${s.body}` : ""}${s.pills.length ? ` / tags: ${s.pills.join(", ")}` : ""}`);
  }
  console.log("Making the images…");
  const { images } = await call<{ images: string[] }>("POST", `/api/projects/${id}/${format}/render`);
  console.log(`✓ ${images.length} images saved in ${config.outputsDir} (the newest "${format}" folder).`);
}

const VIDEO = /\.(mov|mp4|m4v|webm)$/i;

const commands: Record<string, (args: string[]) => Promise<void>> = {
  async doctor() {
    const has = (cmd: string, args: string[]) => spawnSync(cmd, args, { stdio: "ignore", shell: process.platform === "win32" }).status === 0;
    const node = Number(process.versions.node.split(".")[0]);
    const exe = process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli";
    const whisper = await fs.stat(path.join(config.whisperDir, "build", "bin", exe)).then(() => true, () => false);
    const model = await fs.stat(path.join(config.whisperDir, `ggml-${config.whisperModel}.bin`)).then((s) => s.size > 0, () => false);
    const env = await fs.stat(path.join(config.root, ".env")).then(() => true, () => false);
    const running = await fetch(`${base}/api/auth-required`).then(() => true, () => false);
    const checks: [boolean, string, string][] = [
      [node >= 22, `Node.js ${process.versions.node}`, "Install Node.js 22 or newer (Windows: winget install OpenJS.NodeJS.LTS · Mac: brew install node)"],
      [has("ffmpeg", ["-version"]), "ffmpeg", "Install ffmpeg (Windows: winget install Gyan.FFmpeg · Mac: brew install ffmpeg), then open a new terminal"],
      [env || Boolean(config.appPassword), ".env settings file", "Copy .env.example to .env and set APP_PASSWORD"],
      [whisper && model, "Speech-to-text engine", "Run: npm run setup (takes a few minutes the first time)"],
      [running, `Editor running at http://localhost:${config.port}`, "Start it with: npm run local (and leave it running)"],
    ];
    for (const [ok, what, fix] of checks) console.log(`${ok ? "✓" : "✗"} ${what}${ok ? "" : `\n    → ${fix}`}`);
    console.log(`\nInbox folder (drop raw clips here): ${config.inboxDir}\nOutputs folder (finished reels): ${config.outputsDir}`);
  },

  async list() {
    const projects = await call<Project[]>("GET", "/api/projects");
    if (!projects.length) return console.log("No reels yet.");
    for (const p of projects) {
      const len = fmt(buildTimeline(p.words, p.durationMs, p.removePauses, p.silences, p.style.speed).durationMs);
      console.log(`${p.id.slice(0, 8)}  ${p.createdAt.slice(0, 16).replace("T", " ")}  ${len}  ${p.status}/${p.render.status}  ${p.variantLabel ? `[trial: ${p.variantLabel}] ` : ""}${p.hookText || p.originalName}`);
    }
  },

  async import(args) {
    const autopilot = args.includes("--do-it-all");
    let files = args.filter((a) => !a.startsWith("--"));
    const fromInbox = files.length === 0;
    if (fromInbox) {
      await fs.mkdir(config.inboxDir, { recursive: true });
      files = (await fs.readdir(config.inboxDir)).filter((f) => VIDEO.test(f)).map((f) => path.join(config.inboxDir, f));
      if (!files.length) return console.log(`The inbox is empty. Put raw clips in: ${config.inboxDir}`);
    }
    const imported: Project[] = [];
    for (const file of files) {
      console.log(`Importing ${path.basename(file)}…`);
      const p = await call<Project>("POST", "/api/import", { path: path.resolve(file), autopilot });
      imported.push(await waitFor(p.id, (x) => x.status === "ready" && (!autopilot || x.render.status === "done"), path.basename(file)));
      // Once imported, clips move to inbox/done so they aren't imported twice (the file itself is
      // untouched). If importing failed, the clip stays in the inbox to try again.
      if (fromInbox) {
        await fs.mkdir(path.join(config.inboxDir, "done"), { recursive: true });
        await fs.rename(file, path.join(config.inboxDir, "done", path.basename(file)));
      }
    }
    const assets = await call<Asset[]>("GET", "/api/library");
    for (const p of imported) console.log(`\n${describe(p, assets)}\n`);
  },

  async show(args) {
    const id = await resolveId(args[0]);
    const [p, assets] = await Promise.all([call<Project>("GET", `/api/projects/${id}`), call<Asset[]>("GET", "/api/library")]);
    console.log(describe(p, assets));
  },

  async apply(args) {
    const id = await resolveId(args[0]);
    const edits = await readEdits(args[1]);
    const p = await call<Project>("POST", `/api/projects/${id}/apply`, { edits });
    console.log(`✓ Updated. The editor shows the change now.\n\n${describe(p, await call<Asset[]>("GET", "/api/library"))}`);
  },

  // The link to open the editor on a phone on the same Wi-Fi.
  async phone() {
    const { links } = await call<{ links: string[] }>("GET", "/api/phone-link");
    if (!links.length) return console.log("✗ This computer doesn't seem to be on a Wi-Fi/home network right now.");
    console.log(`On your phone (same Wi-Fi as this computer), open:\n  ${links[0]}`);
    if (links.length > 1) console.log(`If that doesn't load, try: ${links.slice(1).join("  or  ")}`);
    console.log("Or in the editor on this computer, tap “📱 Open on phone” and scan the QR code with your phone's camera.");
  },

  async tighten(args) {
    const id = await resolveId(args[0]);
    const before = await call<Project>("GET", `/api/projects/${id}`);
    const p = await call<Project>("POST", `/api/projects/${id}/tighten`);
    const was = fmt(buildTimeline(before.words, before.durationMs, before.removePauses, before.silences, before.style.speed).durationMs);
    console.log(`✓ Tightened: ${was} → ${fmt(buildTimeline(p.words, p.durationMs, p.removePauses, p.silences, p.style.speed).durationMs)}. Check the cut lines in \`show\`.`);
  },

  async export(args) {
    const id = await resolveId(args[0]);
    await call("POST", `/api/projects/${id}/render`);
    await waitFor(id, (p) => p.render.status === "done", "Export");
    console.log(`✓ Exported. Saved in ${config.outputsDir} (the newest file).`);
  },

  async trials(args) {
    const id = await resolveId(args[0]);
    const trials = await call<Project[]>("POST", `/api/projects/${id}/trial-reels`);
    for (const t of trials) {
      await waitFor(t.id, (p) => p.render.status === "done", `Trial reel (${t.variantLabel})`);
      console.log(`✓ ${t.variantLabel}: "${t.hookText}"`);
    }
    console.log(`Saved in ${config.outputsDir}`);
  },

  async caption(args) {
    const id = await resolveId(args[0]);
    const p = await call<Project>("POST", `/api/projects/${id}/caption`, { cta: args.slice(1).join(" ") });
    console.log(p.postCaption);
  },

  // carousel/stories [id] [slides.json]: without a file, drafts slides from the reel's words.
  async carousel(args) {
    await repurpose("carousel", args);
  },

  async stories(args) {
    await repurpose("stories", args);
  },

  // plan [days]: a numbered posting plan of reels that are exported and not yet posted.
  async plan(args) {
    const days = Math.max(1, Number(args[0]) || 7);
    const projects = await call<Project[]>("GET", "/api/projects");
    const ready = projects.filter((p) => !p.parentId && p.render.status === "done" && !p.posted).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (!ready.length) return console.log("Nothing ready to post yet. Export some reels first.");
    const start = new Date();
    const lines = [`# Posting plan (${start.toISOString().slice(0, 10)})`, ""];
    ready.slice(0, days).forEach((p, i) => {
      const day = new Date(start.getTime() + i * 86400000).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      const trials = projects.filter((t) => t.parentId === p.id && t.render.status === "done");
      lines.push(`## ${i + 1}. ${day}: ${p.hookText || p.originalName}`, "");
      lines.push(`- Reel: the outputs file starting with \`${p.createdAt.slice(0, 10)}\` and ending in \`${p.id.slice(0, 6)}.mp4\``);
      if (p.carousel.length) lines.push(`- Carousel (${p.carousel.length} slides): post 2-3 days after the reel`);
      if (p.stories.length) lines.push(`- Stories (${p.stories.length} frames): post the same day, after the reel`);
      if (trials.length) lines.push(`- Trial reels: ${trials.map((t) => t.variantLabel).join(", ")} (post as trials over the following days)`);
      lines.push("", "Caption:", "", p.postCaption || "(no caption yet: ask Claude to write one)", "");
    });
    const file = path.join(config.outputsDir, `posting-plan-${start.toISOString().slice(0, 10)}.md`);
    await fs.mkdir(config.outputsDir, { recursive: true });
    await fs.writeFile(file, lines.join("\n"));
    console.log(lines.join("\n"));
    console.log(`\n✓ Saved to ${file}`);
  },

  async looks() {
    const brand = await call<BrandKit>("GET", "/api/brand");
    console.log(`Brand kit${brand.setUp ? "" : " (not set up yet)"}: ${brand.name}${brand.tagline ? ` · ${brand.tagline}` : ""}`);
    console.log(`Palette: ${brand.palette.map((c) => `${c.name} ${c.hex} (${c.role})`).join(", ") || "(none)"}`);
    console.log(`Fonts: headline ${brand.fonts.headline} · body ${brand.fonts.body} · accent ${brand.fonts.accent}`);
    console.log(`Voice: ${JSON.stringify(brand.voice)}\n`);
    console.log(`Default look: ${JSON.stringify(brand.defaultStyle)}`);
    for (const l of brand.looks) console.log(`"${l.name}": ${JSON.stringify(l.style)}`);
    console.log(`\nBusiness: ${JSON.stringify(brand.business)}\nSaved calls to action: ${JSON.stringify(brand.ctaKeywords)}`);
  },

  async brand(args) {
    // Saves brand-wide settings, e.g. {"business": {...}}, {"palette": [...]}, {"fonts": {...}},
    // {"voice": {...}} or {"defaultStyle": {...}}. Lists (palette, looks, calls to action) are replaced.
    const current = await call<BrandKit>("GET", "/api/brand");
    const edits = await readEdits(args[0]);
    // {"addLook": {"name", "style"}} adds a saved look (replacing one with the same name).
    if (edits.addLook) {
      const others = current.looks.filter((l) => l.name.toLowerCase() !== String(edits.addLook.name).toLowerCase());
      edits.looks = [...others, { id: `look-${Date.now()}`, name: edits.addLook.name, style: { ...current.defaultStyle, ...edits.addLook.style } }];
      delete edits.addLook;
    }
    const next = {
      ...current,
      ...edits,
      business: { ...current.business, ...edits.business },
      fonts: { ...current.fonts, ...edits.fonts },
      voice: { ...current.voice, ...edits.voice },
      defaultStyle: { ...current.defaultStyle, ...edits.defaultStyle },
    };
    await call("PUT", "/api/brand", next);
    console.log("✓ Saved.");
  },

  // Pulls about one still per second from any video, so Claude can look at a style reference.
  async frames(args) {
    const file = args[0];
    if (!file) fail("Give the path to a video.");
    const out = path.join(config.root, "frames", path.basename(file).replace(/\.[^.]+$/, ""));
    await fs.mkdir(out, { recursive: true });
    const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", file, "-vf", "fps=1,scale=540:-2", path.join(out, "%02d.jpg")], {
      shell: process.platform === "win32",
    });
    if (r.status !== 0) fail(`Couldn't read that video: ${r.stderr?.toString().slice(-300)}`);
    console.log(`✓ Stills saved in ${out}`);
  },

  async library() {
    const assets = await call<Asset[]>("GET", "/api/library");
    if (!assets.length) console.log("The library is empty. Add GIFs, images, b-roll, sounds or fonts from the editor.");
    for (const a of assets) console.log(`${a.id.slice(0, 8)}  ${a.kind.padEnd(5)}  ${a.name}`);
    console.log(`\nStarter sounds: ${BUILTIN_SOUNDS.map((b) => b.name).join(", ")}`);
  },
};

const HELP = `Engine commands (npm run engine -- <command>):
  doctor                     check setup and show the inbox/outputs folders
  import [files] [--do-it-all]  import clips (default: everything in the inbox folder)
  list                       list reels
  show [id|latest]           show a reel: words with numbers, hook, look, media, caption
  phone                      the link to open the editor on your phone (same Wi-Fi)
  tighten [id|latest]        cut pauses, ums, repeats and restarted sentences
  apply [id|latest] <json>   change a reel (JSON text, a .json file, or - for stdin)
  caption [id] [call to action]  write the post caption
  export [id|latest]         export to the outputs folder
  trials [id|latest]         make 3 trial reels and export them
  carousel [id] [slides.json]  make carousel images (drafts the slides if no file is given)
  stories [id] [slides.json]   make story frames (same)
  plan [days]                write a numbered posting plan for exported reels
  looks                      show the brand kit, default look, saved looks, business profile
  frames <video>             save stills from a video (to study a style you like)
  brand <json>               save business profile / default look / calls to action
  library                    list GIFs, images, b-roll, sounds and fonts`;

// Output piped into something that stops reading early (like `head`) is fine.
process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});

const [command, ...args] = process.argv.slice(2);
if (!command || !commands[command]) {
  console.log(HELP);
  process.exit(command ? 1 : 0);
}
if (command !== "doctor") await login();
await commands[command](args);
