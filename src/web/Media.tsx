import React, { useEffect, useRef, useState } from "react";
import type { Asset, AssetKind, Overlay, OverlayPlacement, Word } from "../shared/types";
import { api, libraryUrl } from "./api";
import { Card, Label, Options, Slider } from "./ui";

const KIND_LABEL: Record<AssetKind, string> = { gif: "GIFs", image: "Images", video: "B-roll" };

export function Thumb({ asset }: { asset: Asset }) {
  if (asset.thumb) return <img className="thumb" src={libraryUrl(asset.thumb)} alt={asset.name} loading="lazy" />;
  return asset.kind === "video" ? (
    <video className="thumb" src={`${libraryUrl(asset.file)}#t=0.5`} muted playsInline preload="metadata" />
  ) : (
    <img className="thumb" src={libraryUrl(asset.file)} alt={asset.name} loading="lazy" />
  );
}

// Pick something from your library (or upload something new) to show on a line.
export function LibraryPicker({
  assets, onAssets, lineText, onPick, onClose, onAuthError,
}: {
  assets: Asset[];
  onAssets: (assets: Asset[]) => void;
  lineText: string;
  onPick: (asset: Asset) => void;
  onClose: () => void;
  onAuthError: (err: unknown) => void;
}) {
  const [filter, setFilter] = useState<AssetKind | "all">("all");
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const shown = filter === "all" ? assets : assets.filter((a) => a.kind === filter);
  const count = (k: AssetKind) => assets.filter((a) => a.kind === k).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Add an image, GIF or b-roll" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <div className="grow">
            <div className="label accent-text">Your library</div>
            <h2 className="serif">Add an image, GIF or b-roll</h2>
            <p className="muted small">“{lineText}”</p>
          </div>
          <button className="link" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="muted small">
          Images and GIFs pop up over your video on this line. B-roll fills the screen with its sound off, while your voice keeps going.
        </p>
        <Options
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${assets.length}` },
            { value: "gif", label: `${KIND_LABEL.gif} ${count("gif")}` },
            { value: "image", label: `${KIND_LABEL.image} ${count("image")}` },
            { value: "video", label: `${KIND_LABEL.video} ${count("video")}` },
          ]}
        />
        <input
          ref={input}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError("");
            setUploading(0);
            try {
              const asset = await api.uploadAsset(file, setUploading);
              onAssets([asset, ...assets]);
            } catch (err) {
              onAuthError(err);
              setError((err as Error).message);
            }
            setUploading(null);
          }}
        />
        <div className="asset-grid">
          <button className="asset add" disabled={uploading !== null} onClick={() => input.current?.click()}>
            <span className="add-plus">＋</span>
            <span>{uploading === null ? "Add new" : `Uploading ${Math.round(uploading * 100)}%`}</span>
            <span className="muted small">GIF, photo or clip</span>
          </button>
          {shown.map((a) => (
            <div key={a.id} className="asset">
              <button className="asset-pick" onClick={() => onPick(a)}>
                <Thumb asset={a} />
                {a.kind !== "image" ? <span className="asset-kind">{a.kind === "gif" ? "GIF" : "B-roll"}</span> : null}
                <span className="asset-name">{a.name}</span>
              </button>
              <button
                className="asset-delete"
                aria-label={`Delete ${a.name} from your library`}
                onClick={async () => {
                  if (!confirm(`Delete "${a.name}" from your library? It will disappear from any reel using it.`)) return;
                  await api.deleteAsset(a.id).catch(onAuthError);
                  onAssets(assets.filter((x) => x.id !== a.id));
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {error ? <p className="error small">{error}</p> : null}
        {assets.length === 0 ? (
          <p className="muted small">Your library is empty. Add your favorite reaction GIFs, screenshots and b-roll once, and reuse them on every reel.</p>
        ) : null}
      </div>
    </div>
  );
}

const PLACEMENTS: { value: OverlayPlacement; label: string; note: string }[] = [
  { value: "top", label: "Top", note: "near the top" },
  { value: "middle", label: "Middle", note: "centre" },
  { value: "bottom", label: "Lower", note: "above captions" },
  { value: "full", label: "Full screen", note: "covers the video" },
];

export function MediaCard({
  overlays, assets, words, onChange, onSwap, onSeek,
}: {
  overlays: Overlay[];
  assets: Asset[];
  words: Word[];
  onChange: (overlays: Overlay[]) => void;
  onSwap: (overlayId: string) => void;
  onSeek: (wordId: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const index = new Map(words.map((w, i) => [w.id, i]));
  const byId = new Map(assets.map((a) => [a.id, a]));
  const sorted = [...overlays].sort((a, b) => (index.get(a.startWordId) ?? 0) - (index.get(b.startWordId) ?? 0));
  const update = (id: string, patch: Partial<Overlay>) => onChange(overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  // Moves the start or end by one word, keeping start before end.
  const shift = (o: Overlay, edge: "start" | "end", by: number) => {
    const s = index.get(o.startWordId) ?? 0;
    const e = index.get(o.endWordId) ?? s;
    const next = Math.min(words.length - 1, Math.max(0, (edge === "start" ? s : e) + by));
    if (edge === "start" && next <= e) update(o.id, { startWordId: words[next].id });
    if (edge === "end" && next >= s) update(o.id, { endWordId: words[next].id });
  };

  useEffect(() => {
    if (open && !overlays.some((o) => o.id === open)) setOpen(null);
  }, [open, overlays]);

  return (
    <Card title="Media on your reel">
      {sorted.length === 0 ? (
        <p className="muted small">Tap a word in Key words above, then “Add image, GIF or b-roll” to put something on that line.</p>
      ) : null}
      {sorted.map((o) => {
        const asset = byId.get(o.assetId);
        const s = index.get(o.startWordId) ?? 0;
        const e = index.get(o.endWordId) ?? s;
        const line = words.slice(s, e + 1).map((w) => w.text).join(" ");
        return (
          <div key={o.id} className="media-row">
            <div className="row">
              {asset ? <Thumb asset={asset} /> : <span className="thumb missing" />}
              <button className="grow left media-info" onClick={() => onSeek(o.startWordId)}>
                <strong>{asset?.name ?? "Missing from library"}</strong>
                <span className="muted small">on “{line}”</span>
              </button>
              <button className="chip" onClick={() => onSwap(o.id)}>⇄ Swap</button>
              <button className="chip" onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? "Done" : "Adjust"}</button>
            </div>
            {open === o.id ? (
              <div className="media-adjust">
                <Label>Where it shows</Label>
                <Options value={o.placement} onChange={(v) => update(o.id, { placement: v })} options={PLACEMENTS} />
                {o.placement !== "full" ? (
                  <Slider label="Size" value={Math.round(o.size * 100)} min={30} max={95} onChange={(v) => update(o.id, { size: v / 100 })} />
                ) : null}
                <Label>When it's on screen</Label>
                <div className="row">
                  <span className="small grow">Starts</span>
                  <button className="chip" onClick={() => shift(o, "start", -1)}>A word earlier</button>
                  <button className="chip" onClick={() => shift(o, "start", 1)}>A word later</button>
                </div>
                <div className="row">
                  <span className="small grow">Ends</span>
                  <button className="chip" onClick={() => shift(o, "end", -1)}>A word earlier</button>
                  <button className="chip" onClick={() => shift(o, "end", 1)}>A word later</button>
                </div>
                <button className="link danger" onClick={() => onChange(overlays.filter((x) => x.id !== o.id))}>Remove from this reel</button>
              </div>
            ) : null}
          </div>
        );
      })}
    </Card>
  );
}
