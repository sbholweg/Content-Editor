import React, { useEffect, useState } from "react";
import type { Asset } from "../shared/types";
import { api } from "./api";

type Result = { id: string; title: string; preview: string; gif: string; width: number; height: number };
type GiphyImage = { url?: string; width?: string; height?: string };
type GiphyItem = { id: string; title?: string; images?: Record<string, GiphyImage | undefined> };

let cachedKey: Promise<string> | null = null;
const giphyKey = () => (cachedKey ??= api.giphyKey().then((r) => r.key, () => ""));

// Search GIPHY (GIFs or transparent stickers) from the browser and add a pick to the library.
// GIPHY asks that searches come from the app itself, so this runs here, not on the server.
export function GiphySearch({ initialQuery = "", onPicked, onAuthError, compact = false }: {
  initialQuery?: string;
  onPicked: (asset: Asset) => void;
  onAuthError: (err: unknown) => void;
  compact?: boolean;
}) {
  const [key, setKey] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<"gifs" | "stickers">("gifs");
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    giphyKey().then(setKey);
  }, []);

  const search = async (q = query, t = type) => {
    if (!key || !q.trim()) return;
    setError("");
    try {
      const params = new URLSearchParams({ api_key: key, q: q.trim(), limit: compact ? "6" : "24", rating: "pg-13", lang: "en" });
      const response = await fetch(`https://api.giphy.com/v1/${t}/search?${params}`);
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "GIPHY didn't accept the key. Check it in your .env file." : `GIPHY search failed (${response.status}).`);
      const body = (await response.json()) as { data?: GiphyItem[] };
      setResults(
        (body.data ?? []).flatMap((g) => {
          const preview = g.images?.fixed_width_small ?? g.images?.fixed_width;
          const gif = g.images?.downsized ?? g.images?.original;
          return preview?.url && gif?.url
            ? [{ id: g.id, title: g.title || q, preview: preview.url, gif: gif.url, width: Number(gif.width) || 0, height: Number(gif.height) || 0 }]
            : [];
        }),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    if (key && initialQuery) void search(initialQuery);
    // Run once the key arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const pick = async (r: Result) => {
    setBusy(r.id);
    setError("");
    const name = (r.title || query).replace(/\s+GIF.*$/i, "").slice(0, 60) || "GIPHY";
    try {
      // Normally the browser fetches the file and uploads it like any other; if GIPHY's file
      // can't be read here, the editor downloads it instead.
      let asset: Asset;
      try {
        const blob = await (await fetch(r.gif)).blob();
        asset = await api.uploadAsset(new File([blob], `${name}.gif`, { type: "image/gif" }), () => {});
      } catch (err) {
        onAuthError(err);
        asset = await api.addFromGiphy(r.gif, name);
      }
      onPicked(asset);
    } catch (err) {
      onAuthError(err);
      setError((err as Error).message);
    }
    setBusy(null);
  };

  if (key === null) return <p className="muted small">Loading GIPHY…</p>;
  if (!key) {
    return (
      <div className="giphy-empty">
        <strong>Search GIPHY for GIFs and stickers</strong>
        <p className="muted small">
          It needs a free GIPHY key: make an account at developers.giphy.com, create an app (choose “API”), and copy its key. Then tell
          Claude <strong>“add my GIPHY key”</strong> and paste it. Claude saves it and restarts the editor.
        </p>
      </div>
    );
  }

  return (
    <div className={`giphy ${compact ? "compact" : ""}`}>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <input value={query} placeholder="Search GIPHY" onChange={(e) => setQuery(e.target.value)} aria-label="Search GIPHY" />
        <button className="chip accent" type="submit">Search</button>
      </form>
      <div className="row">
        {(["gifs", "stickers"] as const).map((t) => (
          <button
            key={t}
            className={`chip ${type === t ? "accent" : ""}`}
            onClick={() => {
              setType(t);
              void search(query, t);
            }}
          >
            {t === "gifs" ? "GIFs" : "Stickers (see-through)"}
          </button>
        ))}
      </div>
      {error ? <p className="error small">{error}</p> : null}
      {results ? (
        results.length ? (
          <div className="giphy-grid">
            {results.map((r) => (
              <button key={r.id} className="giphy-item" disabled={busy !== null} onClick={() => pick(r)} title={r.title}>
                <img src={r.preview} alt={r.title} loading="lazy" />
                {busy === r.id ? <span className="giphy-busy">Adding…</span> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted small">Nothing found. Try another word.</p>
        )
      ) : null}
      <p className="giphy-credit">Powered by GIPHY</p>
    </div>
  );
}
