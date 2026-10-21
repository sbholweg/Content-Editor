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

// Everything about how a reel looks. Each reel has its own copy, starting from the default look.
export type ReelStyle = {
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

export type SavedLook = { id: string; name: string; style: ReelStyle };

export type BrandKit = {
  name: string;
  business: BusinessProfile;
  defaultStyle: ReelStyle;
  looks: SavedLook[];
  // Calls to action the creator reuses, e.g. 'Comment "VA" for my checklist'.
  ctaKeywords: string[];
};

export type ReelProps = {
  videoSrc: string;
  hookText: string;
  words: Word[];
  brand: ReelStyle;
  // Length of the original, uncut video.
  durationMs: number;
  removePauses: boolean;
  overlays: ResolvedOverlay[];
};

export type AssetKind = "gif" | "image" | "video";

// A GIF, image or b-roll clip in the creator's library, reusable across reels.
export type Asset = {
  id: string;
  name: string;
  kind: AssetKind;
  file: string;
  // Still image shown in the library for b-roll clips.
  thumb?: string;
  width: number;
  height: number;
  durationMs: number;
  createdAt: string;
};

export type OverlayPlacement = "top" | "middle" | "bottom" | "full";

// Media shown over the reel while a range of words is spoken.
export type Overlay = {
  id: string;
  assetId: string;
  startWordId: string;
  endWordId: string;
  placement: OverlayPlacement;
  // Width as a fraction of the frame (ignored for "full").
  size: number;
};

// An overlay ready to draw: the asset's details are included so the video doesn't need the library.
export type ResolvedOverlay = Overlay & { src: string; kind: AssetKind; width: number; height: number };

export type ProjectStatus = "uploaded" | "processing" | "ready" | "error";

export type RenderState = {
  status: "idle" | "rendering" | "done" | "error";
  progress: number;
  error?: string;
};

export type Project = {
  id: string;
  // Goes up by one on every save, so open editors can tell when someone else changed the reel.
  rev?: number;
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
  overlays: Overlay[];
  style: ReelStyle;
  render: RenderState;
  // Set on trial reel versions: the reel they were made from and which angle they use.
  parentId?: string;
  variantLabel?: string;
};
