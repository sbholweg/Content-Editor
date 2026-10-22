import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Asset } from "../src/shared/types.ts";
import { config } from "./config.ts";
import { normalizeBroll, probe, saveStill } from "./media.ts";

// The creator's GIFs, images and b-roll, shared by all their reels.
export const libraryDir = path.join(config.dataDir, "library");
const indexFile = path.join(libraryDir, "library.json");

export async function listAssets(): Promise<Asset[]> {
  try {
    return JSON.parse(await fs.readFile(indexFile, "utf8"));
  } catch {
    return [];
  }
}

async function saveAssets(assets: Asset[]) {
  await fs.mkdir(libraryDir, { recursive: true });
  await fs.writeFile(`${indexFile}.tmp`, JSON.stringify(assets, null, 2));
  await fs.rename(`${indexFile}.tmp`, indexFile);
}

function kindOf(name: string, mimetype: string): Asset["kind"] | null {
  if (/\.(ttf|otf|woff2?)$/i.test(name)) return "font";
  if (mimetype.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg)$/i.test(name)) return "audio";
  if (mimetype === "image/gif" || /\.gif$/i.test(name)) return "gif";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(name)) return "video";
  return null;
}

export async function addAsset(upload: { path: string; originalname: string; mimetype: string; source?: string; collection?: "inspo" }): Promise<Asset> {
  const kind = kindOf(upload.originalname, upload.mimetype);
  if (!kind) {
    await fs.rm(upload.path, { force: true });
    throw new Error("Please choose a GIF, image, video, sound or font file.");
  }
  await fs.mkdir(libraryDir, { recursive: true });
  const id = crypto.randomUUID();
  let file: string;
  let thumb: string | undefined;
  if (kind === "video") {
    // Phone clips are converted the same way as reels, without sound (b-roll plays muted).
    file = `${id}.mp4`;
    await normalizeBroll(upload.path, path.join(libraryDir, file));
    await fs.rm(upload.path, { force: true });
    thumb = `${id}.jpg`;
    await saveStill(path.join(libraryDir, file), path.join(libraryDir, thumb)).catch(() => (thumb = undefined));
  } else {
    file = `${id}${path.extname(upload.originalname).toLowerCase() || (kind === "gif" ? ".gif" : ".jpg")}`;
    await fs.rename(upload.path, path.join(libraryDir, file));
  }
  // Fonts aren't media, so there's nothing to measure.
  const info = kind === "font" ? { width: 0, height: 0, durationMs: 0 } : await probe(path.join(libraryDir, file));
  const asset: Asset = {
    id,
    name: path.basename(upload.originalname, path.extname(upload.originalname)).slice(0, 60),
    kind,
    file,
    thumb,
    source: upload.source,
    collection: upload.collection,
    width: info.width || 1080,
    height: info.height || 1080,
    durationMs: info.durationMs || 0,
    createdAt: new Date().toISOString(),
  };
  await saveAssets([asset, ...(await listAssets())]);
  return asset;
}

export async function deleteAsset(id: string) {
  const assets = await listAssets();
  const asset = assets.find((a) => a.id === id);
  if (!asset) return;
  await fs.rm(path.join(libraryDir, asset.file), { force: true });
  if (asset.thumb) await fs.rm(path.join(libraryDir, asset.thumb), { force: true });
  await saveAssets(assets.filter((a) => a.id !== id));
}

// Adds any new clips from the broll folder to the library. The files in the folder are copied,
// never moved or changed.
let syncing: Promise<number> | null = null;
export function syncBrollFolder() {
  syncing ??= (async () => {
    await fs.mkdir(config.brollDir, { recursive: true });
    const known = new Set((await listAssets()).map((a) => a.source).filter(Boolean));
    let added = 0;
    for (const name of await fs.readdir(config.brollDir)) {
      if (!/\.(mov|mp4|m4v|webm)$/i.test(name) || known.has(name)) continue;
      const temp = path.join(config.dataDir, "uploads", `broll-${Date.now()}-${name}`);
      await fs.mkdir(path.dirname(temp), { recursive: true });
      await fs.copyFile(path.join(config.brollDir, name), temp);
      await addAsset({ path: temp, originalname: name, mimetype: "video/mp4", source: name }).catch((err) => console.error(`Couldn't add ${name}:`, err));
      added++;
    }
    return added;
  })().finally(() => (syncing = null));
  return syncing;
}
