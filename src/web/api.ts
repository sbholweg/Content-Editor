import type { Asset, BrandKit, Project, SlideFormat } from "../shared/types";

type EditableField =
  | "words" | "hookText" | "hookSubText" | "postCaption" | "removePauses" | "style" | "overlays" | "sounds" | "music" | "soundsEnabled"
  | "carousel" | "stories" | "posted" | "slideDesign" | "broll" | "coverMs" | "notes";

const TOKEN_KEY = "content-editor-token";

// Storage can be blocked in private mode or inside some iframes; fall back to memory.
let memoryToken = "";
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}
export function setToken(token: string) {
  memoryToken = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export class AuthError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) throw new AuthError("Please log in");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export type EngineEvent = { type: "project"; id: string; rev: number } | { type: "project-deleted"; id: string } | { type: "brand" };

// Listens for changes made outside this page (for example by Claude) so it can refresh live.
export function onEngineEvents(handler: (event: EngineEvent) => void) {
  const token = getToken();
  const source = new EventSource(`/api/events${token ? `?t=${token}` : ""}`);
  source.onmessage = (e) => {
    try {
      handler(JSON.parse(e.data));
    } catch {
      // ignore malformed messages
    }
  };
  return () => source.close();
}

export const libraryUrl = (file: string) => {
  const token = getToken();
  return `/media/library/${file}${token ? `?t=${token}` : ""}`;
};

// Any file in a reel's folder, e.g. a carousel image or a background frame.
export const projectFileUrl = (id: string, name: string, bust = "") => {
  const params = new URLSearchParams();
  const token = getToken();
  if (token) params.set("t", token);
  if (bust) params.set("v", bust);
  return `/media/${id}/${name}?${params.toString()}`;
};

export const mediaUrl = (id: string, file: "video.mp4" | "export.mp4", bust = "") => {
  const params = new URLSearchParams();
  const token = getToken();
  if (token) params.set("t", token);
  if (bust) params.set("v", bust);
  const q = params.toString();
  return `/media/${id}/${file}${q ? `?${q}` : ""}`;
};

export const api = {
  authRequired: () => request<{ required: boolean }>("/api/auth-required"),
  login: (password: string) => request<{ token: string }>("/api/login", { method: "POST", body: JSON.stringify({ password }) }),
  listProjects: () => request<Project[]>("/api/projects"),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  saveProject: (id: string, patch: Partial<Pick<Project, EditableField>>) =>
    request<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  autoHighlight: (id: string) => request<Project>(`/api/projects/${id}/auto-highlight`, { method: "POST" }),
  writeCaption: (id: string, cta: string) => request<Project>(`/api/projects/${id}/caption`, { method: "POST", body: JSON.stringify({ cta }) }),
  makeTrialReels: (id: string) => request<Project[]>(`/api/projects/${id}/trial-reels`, { method: "POST" }),
  listTrialReels: (id: string) => request<Project[]>(`/api/projects/${id}/trial-reels`),
  phoneLink: () => request<{ links: string[]; token: string }>("/api/phone-link"),
  aiStatus: () => request<{ source: "api" | "claude-code" | "rules" }>("/api/ai-status"),
  tighten: (id: string) => request<Project>(`/api/projects/${id}/tighten`, { method: "POST", body: "{}" }),
  draftSlides: (id: string, format: SlideFormat) => request<Project>(`/api/projects/${id}/${format}/draft`, { method: "POST", body: "{}" }),
  renderSlides: (id: string, format: SlideFormat) => request<{ images: string[] }>(`/api/projects/${id}/${format}/render`, { method: "POST", body: "{}" }),
  deleteProject: (id: string) => request<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
  render: (id: string) => request<Project>(`/api/projects/${id}/render`, { method: "POST" }),
  getBrand: () => request<BrandKit>("/api/brand"),
  saveBrand: (brand: BrandKit) => request<BrandKit>("/api/brand", { method: "PUT", body: JSON.stringify(brand) }),

  listAssets: () => request<Asset[]>("/api/library"),
  deleteAsset: (id: string) => request<{ ok: true }>(`/api/library/${id}`, { method: "DELETE" }),
  uploadAsset: (file: File, onProgress: (fraction: number) => void, collection?: "inspo") =>
    sendFile<Asset>("/api/library", collection ? { collection, file } : { file }, onProgress),
  generateBrand: (answers: { name: string; what: string; audience: string; vibe: string; inspirationIds: string[] }) =>
    request<BrandKit>("/api/brand/generate", { method: "POST", body: JSON.stringify(answers) }),

  upload: (file: File, autopilot: boolean, onProgress: (fraction: number) => void) =>
    sendFile<Project>("/api/projects", { autopilot: autopilot ? "1" : "0", video: file }, onProgress),
};

// XHR instead of fetch so we can show upload progress for big phone videos.
function sendFile<T>(url: string, fields: Record<string, string | File>, onProgress: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status === 401) return reject(new AuthError("Please log in"));
      try {
        const data = JSON.parse(xhr.responseText);
        xhr.status < 300 ? resolve(data) : reject(new Error(data.error ?? "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    // Text fields go first so the server sees them as soon as the upload starts.
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    xhr.send(form);
  });
}
