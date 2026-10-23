import { Gif } from "@remotion/gif";
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReelStyle, ResolvedOverlay } from "../shared/types";
import { Graphic, GRAPHIC_Y } from "./Graphic";

// A broken b-roll file shouldn't stop the whole reel from previewing or exporting.
const ignoreMediaError = (err: Error) => console.warn("Overlay media failed to play:", err.message);

export const PLACEMENT_TOP: Record<Exclude<ResolvedOverlay["placement"], "full">, number> = {
  top: 22,
  middle: 45,
  bottom: 62,
};

export const Overlays: React.FC<{ items: { overlay: ResolvedOverlay; startMs: number; endMs: number }[]; brand: ReelStyle }> = ({ items, brand }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {items.map(({ overlay, startMs, endMs }) => {
        const from = Math.round((startMs / 1000) * fps);
        const length = Math.max(1, Math.round((endMs / 1000) * fps) - from);
        return (
          <Sequence key={overlay.id} from={from} durationInFrames={length} premountFor={fps}>
            <OverlayItem overlay={overlay} length={length} brand={brand} />
          </Sequence>
        );
      })}
    </>
  );
};

const OverlayItem: React.FC<{ overlay: ResolvedOverlay; length: number; brand: ReelStyle }> = ({ overlay, length, brand }) => {
  const frame = useCurrentFrame();
  const { fps, width: frameWidth } = useVideoConfig();

  // B-roll fills the screen with its own sound muted; the speaker's voice keeps playing.
  if (overlay.placement === "full") {
    const media =
      overlay.kind === "video" ? (
        <OffthreadVideo src={overlay.src} muted onError={ignoreMediaError} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : overlay.kind === "gif" ? (
        <Gif src={overlay.src} width={frameWidth} height={Math.round((frameWidth * 16) / 9)} fit="cover" />
      ) : (
        <Img src={overlay.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      );
    return <AbsoluteFill>{media}</AbsoluteFill>;
  }

  const enter = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const exit = spring({ frame: frame - (length - 6), fps, config: { damping: 20, stiffness: 200 } });
  const scale = Math.max(0, enter - exit);
  const width = Math.round(frameWidth * overlay.size);
  const height = Math.round((width * overlay.height) / Math.max(1, overlay.width));
  if (overlay.kind === "graphic" && overlay.graphic) {
    return (
      <div
        style={{
          position: "absolute",
          left: `${overlay.x ?? (overlay.graphic.kind === "element" ? 80 : 50)}%`,
          top: `${overlay.y ?? GRAPHIC_Y[overlay.graphic.kind]}%`,
          transform: `translate(-50%, -50%) scale(${scale}) rotate(${(1 - enter) * -8}deg)`,
        }}
      >
        <Graphic graphic={overlay.graphic} brand={brand} width={width} />
      </div>
    );
  }
  const frameStyle = overlay.frame ?? "card";
  const radius = frameStyle === "none" || frameStyle === "paper" ? 0 : frameStyle === "phone" ? 34 : frameStyle === "browser" ? 0 : 28;
  const box: React.CSSProperties = {
    width, height, borderRadius: radius, overflow: "hidden", display: "block",
    boxShadow: frameStyle === "card" ? "0 18px 50px rgba(0,0,0,0.35)" : undefined,
  };
  const media =
    overlay.kind === "gif" ? (
      <div style={box}>
        <Gif src={overlay.src} width={width} height={height} fit={frameStyle === "none" ? "contain" : "cover"} />
      </div>
    ) : overlay.kind === "video" ? (
      <OffthreadVideo src={overlay.src} muted onError={ignoreMediaError} style={{ ...box, objectFit: "cover" }} />
    ) : (
      <Img src={overlay.src} style={{ ...box, objectFit: frameStyle === "none" ? "contain" : "cover" }} />
    );

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.x ?? 50}%`,
        top: `${overlay.y ?? PLACEMENT_TOP[overlay.placement]}%`,
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${(1 - enter) * -6 + (frameStyle === "paper" ? -3 : 0)}deg)`,
      }}
    >
      <Framed frame={frameStyle}>{media}</Framed>
    </div>
  );
};

// Screenshot frames: a tilted paper card with a hard shadow, a phone, or a browser window.
const Framed: React.FC<{ frame: NonNullable<ResolvedOverlay["frame"]>; children: React.ReactNode }> = ({ frame, children }) => {
  if (frame === "paper") {
    return <div style={{ background: "#fff", padding: 18, boxShadow: "14px 14px 0 #111014", border: "4px solid #111014" }}>{children}</div>;
  }
  if (frame === "phone") {
    return (
      <div style={{ position: "relative", background: "#111014", padding: "26px 16px", borderRadius: 54, boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
        <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 110, height: 10, borderRadius: 6, background: "#2c2a33" }} />
        {children}
      </div>
    );
  }
  if (frame === "browser") {
    return (
      <div style={{ background: "#f3f1ef", borderRadius: 22, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ height: 50, display: "flex", alignItems: "center", gap: 10, padding: "0 20px" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
          ))}
          <span style={{ flex: 1, height: 22, marginLeft: 14, borderRadius: 11, background: "#e3dfdb" }} />
        </div>
        {children}
      </div>
    );
  }
  return <>{children}</>;
};
