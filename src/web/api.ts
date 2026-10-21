import type { BrandKit, Project, Word } from "../shared/types";

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
  saveProject: (id: string, patch: { words?: Word[]; hookText?: string; removePauses?: boolean; postCaption?: string }) =>
    request<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  autoHighlight: (id: string) => request<Project>(`/api/projects/${id}/auto-highlight`, { method: "POST" }),
  writeCaption: (id: string, cta: string) => request<Project>(`/api/projects/${id}/caption`, { method: "POST", body: JSON.stringify({ cta }) }),
  deleteProject: (id: string) => request<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
  render: (id: string) => request<Project>(`/api/projects/${id}/render`, { method: "POST" }),
  getBrand: () => request<BrandKit>("/api/brand"),
  saveBrand: (brand: BrandKit) => request<BrandKit>("/api/brand", { method: "PUT", body: JSON.stringify(brand) }),

  // XHR instead of fetch so we can show upload progress for big phone videos.
  upload(file: File, onProgress: (fraction: number) => void): Promise<Project> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/projects");
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
      const form = new FormData();
      form.append("video", file);
      xhr.send(form);
    });
  },
};
