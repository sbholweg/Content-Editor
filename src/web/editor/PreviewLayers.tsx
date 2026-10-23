import React, { useRef } from "react";
import { GRAPHIC_Y } from "../../remotion/Graphic";
import type { Overlay } from "../../shared/types";
import { useEditor } from "./context";

// Drawn over the preview only (never exported): roughly where Instagram puts its buttons,
// username, caption and audio label on a reel, so you can keep important things clear of them.
export function InstagramOverlay({ handle }: { handle: string }) {
  return (
    <div className="ig-layer" aria-hidden>
      <div className="ig-top">
        <strong>Reels</strong>
        <Icon d="M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      </div>
      <div className="ig-side">
        <span><Icon d="M12 20s-7-4.4-7-9.6A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.4C19 15.6 12 20 12 20z" />1,204</span>
        <span><Icon d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5z" />86</span>
        <span><Icon d="M21 4 3 11l7 2.5L21 4zM10 13.5 12.5 21 21 4" /></span>
        <span><Icon d="M6 12h.01M12 12h.01M18 12h.01" /></span>
        <span className="ig-audio-thumb" />
      </div>
      <div className="ig-bottom">
        <div className="ig-user">
          <span className="ig-avatar" />
          <strong>{handle}</strong>
          <span className="ig-follow">Follow</span>
        </div>
        <div className="ig-caption">Your post caption shows here… <span>more</span></div>
        <div className="ig-caption">♫ {handle} · Original audio</div>
      </div>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const PLACEMENT_Y: Record<Exclude<Overlay["placement"], "full">, number> = { top: 22, middle: 45, bottom: 62 };
const HOOK_Y = { top: 13, middle: 42, bottom: 62 } as const;
const clamp = (v: number) => Math.min(96, Math.max(4, Math.round(v * 10) / 10));

// "Move" mode: a handle on the hook and on each image or GIF showing right now. Drag a handle
// and the thing moves with it, live in the preview and in the export.
export function MoveLayer() {
  const { reel, update, outputTimes, timeMs, assets } = useEditor();
  const layer = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const drag = (onMove: (x: number, y: number) => void) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const box = layer.current?.getBoundingClientRect();
      if (!box) return;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() =>
        onMove(clamp(((ev.clientX - box.left) / box.width) * 100), clamp(((ev.clientY - box.top) / box.height) * 100)),
      );
    };
    const target = e.currentTarget;
    const stop = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", stop);
      target.removeEventListener("pointercancel", stop);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", stop);
    target.addEventListener("pointercancel", stop);
  };

  const style = reel.style;
  const hook = style.hookPlace ?? { x: 50, y: HOOK_Y[style.hookPosition] };
  const showing = reel.overlays.filter((o) => {
    if (o.placement === "full") return false;
    const start = outputTimes.get(o.startWordId)?.startMs;
    const end = outputTimes.get(o.endWordId)?.endMs;
    return start !== undefined && end !== undefined && timeMs >= start - 100 && timeMs <= end + 100;
  });
  const moveOverlay = (id: string, x: number, y: number) =>
    update({ overlays: reel.overlays.map((o) => (o.id === id ? { ...o, x, y } : o)) });

  return (
    <div className="move-layer" ref={layer}>
      {reel.hookText.trim() ? (
        <button
          className="move-handle"
          style={{ left: `${hook.x}%`, top: `${hook.y}%` }}
          onPointerDown={drag((x, y) => update({ style: { ...style, hookPlace: { x, y } } }))}
          aria-label="Drag to move the hook"
        >
          ✥ Hook
        </button>
      ) : null}
      {showing.map((o) => {
        const name = o.graphic ? "Graphic" : assets.find((a) => a.id === o.assetId)?.kind === "gif" ? "GIF" : "Image";
        return (
          <button
            key={o.id}
            className="move-handle media"
            style={{ left: `${o.x ?? 50}%`, top: `${o.y ?? (o.graphic ? GRAPHIC_Y[o.graphic.kind] : PLACEMENT_Y[o.placement as keyof typeof PLACEMENT_Y])}%` }}
            onPointerDown={drag((x, y) => moveOverlay(o.id, x, y))}
            aria-label={`Drag to move this ${name.toLowerCase()}`}
          >
            ✥ {name}
          </button>
        );
      })}
      {!reel.hookText.trim() && showing.length === 0 ? (
        <p className="move-hint">Play or scrub to a moment with an image or GIF on screen to move it.</p>
      ) : null}
    </div>
  );
}
