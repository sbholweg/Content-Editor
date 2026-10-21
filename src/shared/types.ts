export type Word = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  highlight: boolean;
  emoji?: string;
  // Removed from the video.
  cut?: boolean;
};

export type CaptionStyle = "clean" | "pill" | "pop" | "accent";
export type CaptionPosition = "top" | "middle" | "bottom";

export type BrandKit = {
  name: string;
  font: string;
  // Used for the hook title and for "accent" highlighted words.
  displayFont: string;
  hookColor: string;
  // How long the hook stays on screen. 0 = the whole video.
  hookDurationMs: number;
  textColor: string;
  outlineColor: string;
  highlightColor: string;
  highlightTextColor: string;
  style: CaptionStyle;
  position: CaptionPosition;
  wordsPerLine: number;
  uppercase: boolean;
  fontSize: number;
};

export type ReelProps = {
  videoSrc: string;
  hookText: string;
  words: Word[];
  brand: BrandKit;
  // Length of the original, uncut video.
  durationMs: number;
  removePauses: boolean;
};

export type ProjectStatus = "uploaded" | "processing" | "ready" | "error";

export type RenderState = {
  status: "idle" | "rendering" | "done" | "error";
  progress: number;
  error?: string;
};

export type Project = {
  id: string;
  createdAt: string;
  originalName: string;
  status: ProjectStatus;
  step?: string;
  error?: string;
  durationMs: number;
  width: number;
  height: number;
  hookText: string;
  words: Word[];
  removePauses: boolean;
  render: RenderState;
};
