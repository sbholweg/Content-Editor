import { createContext, useContext } from "react";
import type { Line } from "../../shared/lines";
import type { buildTimeline } from "../../shared/timeline";
import type { Asset, BrandKit, Project, Word } from "../../shared/types";

// The parts of a reel you can edit; saved together.
export type ReelState = Pick<
  Project,
  "words" | "hookText" | "hookSubText" | "postCaption" | "removePauses" | "style" | "overlays" | "sounds" | "music" | "soundsEnabled"
>;

// What the library picker was opened for.
export type PickerTarget =
  | { kind: "overlay-add"; fromWordId: string; toWordId: string }
  | { kind: "overlay-swap"; overlayId: string }
  | { kind: "sound-add"; wordId: string }
  | { kind: "sound-swap"; cueId: string }
  | { kind: "music" };

export type EditorApi = {
  project: Project;
  reel: ReelState;
  update: (patch: Partial<ReelState>) => void;
  brand: BrandKit;
  updateBrand: (brand: BrandKit) => void;
  assets: Asset[];
  setAssets: (assets: Asset[]) => void;
  timeline: ReturnType<typeof buildTimeline>;
  // Where each kept word lands in the cut video.
  outputTimes: Map<string, Word>;
  lines: Line[];
  timeMs: number;
  seekToWord: (wordId: string) => void;
  openPicker: (target: PickerTarget) => void;
  onAuthError: (err: unknown) => void;
};

export const EditorContext = createContext<EditorApi | null>(null);

export function useEditor() {
  const api = useContext(EditorContext);
  if (!api) throw new Error("useEditor must be used inside the editor");
  return api;
}

export const formatTime = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};
