import { Gif } from "@remotion/gif";
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ResolvedOverlay } from "../shared/types";

// A broken b-roll file shouldn't stop the whole reel from previewing or exporting.
const ignoreMediaError = (err: Error) => console.warn("Overlay media failed to play:", err.message);

const PLACEMENT_TOP: Record<Exclude<ResolvedOverlay["placement"], "full">, number> = {
  top: 22,
  middle: 45,
  bottom: 62,
};

export const Overlays: React.FC<{ items: { overlay: ResolvedOverlay; startMs: number; endMs: number }[] }> = ({ items }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {items.map(({ overlay, startMs, endMs }) => {
        const from = Math.round((startMs / 1000) * fps);
        const length = Math.max(1, Math.round((endMs / 1000) * fps) - from);
        return (
          <Sequence key={overlay.id} from={from} durationInFrames={length} premountFor={fps}>
            <OverlayItem overlay={overlay} length={length} />
          </Sequence>
        );
      })}
    </>
  );
};

const OverlayItem: React.FC<{ overlay: ResolvedOverlay; length: number }> = ({ overlay, length }) => {
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
  const box: React.CSSProperties = { width, height, borderRadius: 28, overflow: "hidden", boxShadow: "0 18px 50px rgba(0,0,0,0.35)" };

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: `${PLACEMENT_TOP[overlay.placement]}%`,
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${(1 - enter) * -6}deg)`,
      }}
    >
      {overlay.kind === "gif" ? (
        <div style={box}>
          <Gif src={overlay.src} width={width} height={height} fit="cover" />
        </div>
      ) : overlay.kind === "video" ? (
        <OffthreadVideo src={overlay.src} muted onError={ignoreMediaError} style={{ ...box, objectFit: "cover" }} />
      ) : (
        <Img src={overlay.src} style={{ ...box, objectFit: "cover" }} />
      )}
    </div>
  );
};
