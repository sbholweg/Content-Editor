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

// How key words stand out: a colored bubble behind the word, colored text, or colored text in the display font.
export type KeyWordStyle = "pill" | "color" | "serif";
export type CaptionMode = "phrase" | "single";
export type TextEffect = "shadow" | "outline";
export type CaptionPosition = "top" | "middle" | "bottom";

// Used by Claude to tailor hooks and post captions to the creator's business.
export type BusinessProfile = {
  what: string;
  audience: string;
  cta: string;
};

export type BrandKit = {
  name: string;
  business: BusinessProfile;
  font: string;
  // Used for the hook title and for "accent" highlighted words.
  displayFont: string;
  hookColor: string;
  hookPosition: CaptionPosition;
  // How long the hook stays on screen. 0 = the whole video.
  hookDurationMs: number;
  textColor: string;
  outlineColor: string;
  highlightColor: string;
  highlightTextColor: string;
  style: KeyWordStyle;
  captionMode: CaptionMode;
  textEffect: TextEffect;
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
  postCaption: string;
  words: Word[];
  removePauses: boolean;
  render: RenderState;
};
