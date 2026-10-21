import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Asset, Overlay, ResolvedOverlay } from "../src/shared/types.ts";
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
  if (mimetype === "image/gif" || /\.gif$/i.test(name)) return "gif";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(name)) return "video";
  return null;
}

export async function addAsset(upload: { path: string; originalname: string; mimetype: string }): Promise<Asset> {
  const kind = kindOf(upload.originalname, upload.mimetype);
  if (!kind) {
    await fs.rm(upload.path, { force: true });
    throw new Error("Please choose a GIF, image or video.");
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
  const info = await probe(path.join(libraryDir, file));
  const asset: Asset = {
    id,
    name: path.basename(upload.originalname, path.extname(upload.originalname)).slice(0, 60),
    kind,
    file,
    thumb,
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

// Attaches each overlay's file details. Overlays whose asset was deleted are skipped.
export async function resolveOverlays(overlays: Overlay[], urlFor: (file: string) => string): Promise<ResolvedOverlay[]> {
  const assets = new Map((await listAssets()).map((a) => [a.id, a]));
  return overlays.flatMap((o) => {
    const a = assets.get(o.assetId);
    return a ? [{ ...o, src: urlFor(a.file), kind: a.kind, width: a.width, height: a.height }] : [];
  });
}
