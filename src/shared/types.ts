export type Word = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  highlight: boolean;
  emoji?: string;
};

export type CaptionStyle = "pop" | "pill" | "accent";
export type CaptionPosition = "top" | "middle" | "bottom";

export type BrandKit = {
  name: string;
  font: string;
  accentFont: string;
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
  words: Word[];
  brand: BrandKit;
  durationMs: number;
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
  words: Word[];
  render: RenderState;
};
