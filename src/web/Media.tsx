import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Asset, AssetKind, Overlay, OverlayPlacement } from "../shared/types";
import { api, libraryUrl } from "./api";
import { GiphySearch } from "./Giphy";
import { Label, Options, Slider } from "./ui";

type VisualKind = "gif" | "image" | "video";
const VISUAL: VisualKind[] = ["gif", "image", "video"];
const KIND_LABEL: Record<VisualKind, string> = { gif: "GIFs", image: "Photos & graphics", video: "B-roll" };

export function Thumb({ asset }: { asset: Asset }) {
  if (asset.thumb) return <img className="thumb" src={libraryUrl(asset.thumb)} alt={asset.name} loading="lazy" />;
  return asset.kind === "video" ? (
    <video className="thumb" src={`${libraryUrl(asset.file)}#t=0.5`} muted playsInline preload="metadata" />
  ) : (
    <img className="thumb" src={libraryUrl(asset.file)} alt={asset.name} loading="lazy" />
  );
}

// Uploads a file to the library, reporting progress; shared by every "Add new" button.
export function useUpload(onAdded: (asset: Asset) => void, onAuthError: (err: unknown) => void) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setProgress(0);
    try {
      onAdded(await api.uploadAsset(file, setProgress));
    } catch (err) {
      onAuthError(err);
      setError((err as Error).message);
    }
    setProgress(null);
  };
  return { progress, error, upload };
}

// Your GIFs, photos and b-roll. Tap one to use it (when onPick is given), add new ones, or delete.
export function LibraryBrowser({
  assets, onAssets, onPick, onAuthError,
}: {
  assets: Asset[];
  onAssets: (assets: Asset[]) => void;
  onPick?: (asset: Asset) => void;
  onAuthError: (err: unknown) => void;
}) {
  const [filter, setFilter] = useState<VisualKind | "all">("all");
  const [source, setSource] = useState<"mine" | "giphy">("mine");
  const input = useRef<HTMLInputElement>(null);
  const visuals = assets.filter((a) => (VISUAL as AssetKind[]).includes(a.kind) && a.collection !== "inspo");
  const shown = filter === "all" ? visuals : visuals.filter((a) => a.kind === filter);
  const { progress, error, upload } = useUpload((a) => onAssets([a, ...assets]), onAuthError);

  return (
    <div className="library-browser">
      <div className="segmented big">
        <button className={source === "mine" ? "on" : ""} onClick={() => setSource("mine")}>Your library</button>
        <button className={source === "giphy" ? "on" : ""} onClick={() => setSource("giphy")}>Search GIPHY</button>
      </div>
      {source === "giphy" ? (
        <GiphySearch
          onAuthError={onAuthError}
          onPicked={(a) => {
            onAssets([a, ...assets]);
            if (onPick) onPick(a);
            else setSource("mine");
          }}
        />
      ) : (
      <>
      <Options
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: `All ${visuals.length}` },
          ...VISUAL.map((k) => ({ value: k, label: `${KIND_LABEL[k]} ${visuals.filter((a) => a.kind === k).length}` })),
        ]}
      />
      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div
        className="asset-grid"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void upload(e.dataTransfer.files?.[0]);
        }}
      >
        <button className="asset add" disabled={progress !== null} onClick={() => input.current?.click()}>
          <span className="add-plus">＋</span>
          <span>{progress === null ? "Add new" : `Uploading ${Math.round(progress * 100)}%`}</span>
          <span className="muted small">or drop a file here</span>
        </button>
        {shown.map((a) => (
          <div key={a.id} className="asset">
            <button className="asset-pick" onClick={() => onPick?.(a)} disabled={!onPick}>
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
      </>
      )}
    </div>
  );
}

export function Modal({ title, eyebrow, subtitle, onClose, children }: { title: string; eyebrow?: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  // Rendered at the page level so a sticky, blurred header can't trap it (fixed elements inside a
  // backdrop-filter are positioned relative to that element, not the screen).
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <div className="grow">
            {eyebrow ? <div className="label accent-text">{eyebrow}</div> : null}
            <h2>{title}</h2>
            {subtitle ? <p className="muted small">{subtitle}</p> : null}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

const PLACEMENTS: { value: OverlayPlacement; label: string; note: string }[] = [
  { value: "top", label: "Top", note: "near the top" },
  { value: "middle", label: "Middle", note: "centre" },
  { value: "bottom", label: "Lower", note: "above captions" },
  { value: "full", label: "Full screen", note: "covers the video" },
];

// Where and when one image/GIF/b-roll shows. "shift" nudges its start or end by a word.
export function OverlayAdjust({
  overlay, onChange, onShift, onRemove,
}: {
  overlay: Overlay;
  onChange: (patch: Partial<Overlay>) => void;
  onShift: (edge: "start" | "end", by: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="adjust">
      <Label>Where it shows</Label>
      <p className="muted small">Or tap “✥ Move” above the preview and drag it anywhere.</p>
      <Options
        value={overlay.x !== undefined && overlay.placement !== "full" ? ("custom" as Overlay["placement"]) : overlay.placement}
        onChange={(v) => onChange({ placement: v, x: undefined, y: undefined })}
        options={PLACEMENTS}
      />
      {overlay.placement !== "full" ? (
        <>
          <Label>Frame</Label>
          <Options
            value={overlay.frame ?? "card"}
            onChange={(v) => onChange({ frame: v })}
            options={[
              { value: "card", label: "Rounded", note: "soft shadow" },
              { value: "paper", label: "Paper", note: "tilted, bold shadow" },
              { value: "phone", label: "Phone", note: "for app screenshots" },
              { value: "browser", label: "Browser", note: "for web pages" },
              { value: "none", label: "No frame", note: "see-through stickers" },
            ]}
          />
        </>
      ) : null}
      {overlay.placement !== "full" ? (
        <Slider label="Size" value={Math.round(overlay.size * 100)} min={30} max={95} onChange={(v) => onChange({ size: v / 100 })} />
      ) : null}
      <Label>When it's on screen</Label>
      <div className="row">
        <span className="small grow">Starts</span>
        <button className="chip" onClick={() => onShift("start", -1)}>A word earlier</button>
        <button className="chip" onClick={() => onShift("start", 1)}>A word later</button>
      </div>
      <div className="row">
        <span className="small grow">Ends</span>
        <button className="chip" onClick={() => onShift("end", -1)}>A word earlier</button>
        <button className="chip" onClick={() => onShift("end", 1)}>A word later</button>
      </div>
      <button className="link danger" onClick={onRemove}>Remove from this reel</button>
    </div>
  );
}
