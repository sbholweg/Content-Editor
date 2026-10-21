import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_BRAND, normalizeBrand, normalizeStyle } from "../src/shared/brand.ts";
import type { BrandKit, Project } from "../src/shared/types.ts";
import { config } from "./config.ts";

export const projectsDir = path.join(config.dataDir, "projects");
const brandFile = path.join(config.dataDir, "brand.json");

export const projectDir = (id: string) => path.join(projectsDir, id);
export const projectFile = (id: string, name: string) => path.join(projectDir(id), name);

export async function ensureDirs() {
  await fs.mkdir(projectsDir, { recursive: true });
}

export function isValidId(id: string) {
  return /^[a-z0-9-]{8,40}$/.test(id);
}

export async function readProject(id: string): Promise<Project | null> {
  if (!isValidId(id)) return null;
  try {
    const project = JSON.parse(await fs.readFile(projectFile(id, "project.json"), "utf8"));
    // Reels made before each reel had its own look use the current default look.
    const style = project.style ? normalizeStyle(project.style) : (await readBrand()).defaultStyle;
    return { hookText: "", postCaption: "", removePauses: false, ...project, style };
  } catch {
    return null;
  }
}

export async function writeProject(project: Project) {
  const file = projectFile(project.id, "project.json");
  await fs.writeFile(`${file}.tmp`, JSON.stringify(project, null, 2));
  await fs.rename(`${file}.tmp`, file);
}

export async function updateProject(id: string, patch: Partial<Project>) {
  const project = await readProject(id);
  if (!project) throw new Error(`Project ${id} not found`);
  const next = { ...project, ...patch };
  await writeProject(next);
  return next;
}

export async function listProjects(): Promise<Project[]> {
  const ids = await fs.readdir(projectsDir).catch(() => []);
  const projects = await Promise.all(ids.map(readProject));
  return projects
    .filter((p): p is Project => p !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteProject(id: string) {
  if (!isValidId(id)) return;
  await fs.rm(projectDir(id), { recursive: true, force: true });
}

export async function readBrand(): Promise<BrandKit> {
  try {
    return normalizeBrand(JSON.parse(await fs.readFile(brandFile, "utf8")));
  } catch {
    return DEFAULT_BRAND;
  }
}

export async function writeBrand(brand: BrandKit) {
  await fs.writeFile(brandFile, JSON.stringify(brand, null, 2));
}
