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
export type KeyWordStyle = "pill" | "color" | "serif" | "accent" | "swipe" | "underline";
export type CaptionMode = "phrase" | "single" | "karaoke";
export type TextEffect = "shadow" | "outline";
export type CaptionPosition = "top" | "middle" | "bottom";

// Used by Claude to tailor hooks and post captions to the creator's business.
export type BusinessProfile = {
  what: string;
  audience: string;
  cta: string;
};

// Everything about how a reel looks. Each reel has its own copy, starting from the default look.
export type HookLayout = "headline" | "eyebrow" | "subhead";

export type ReelStyle = {
  font: string;
  // Used for the hook title and for "accent" highlighted words.
  displayFont: string;
  hookColor: string;
  hookPosition: CaptionPosition;
  // Where the hook was dragged to (its center, as % of the frame). Overrides hookPosition when set.
  hookPlace: { x: number; y: number } | null;
  // "headline": one big line. "eyebrow": small line above a big one. "subhead": big line, small line below.
  hookLayout: HookLayout;
  // How the hook appears: pops in, or types on letter by letter with a key click per letter.
  hookAnimation: "pop" | "typewriter";
  // Words in the hook marked with *stars*: in the accent font inside a key-color block, or just colored.
  hookAccent: "block" | "color";
  // The brand's accent font (an italic serif or script) for *starred* hook words and "accent" key words.
  accentFont: string;
  // How each caption line arrives.
  captionAnimation: "pop" | "bounce" | "slide" | "fade" | "reveal";
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
  // Punch in and out between lines (hides cuts, keeps it moving).
  zoomJumps: boolean;
  // Which kind of zoom, when zooms are on.
  zoomStyle: "lines" | "keywords" | "push" | "crash";
  // Playback speed of the talking (1 = normal; 1.2 is a popular, energetic talking-reel speed).
  speed: number;
  // Clean audio: less background noise, even volume, social-media loudness (uses video-clean.mp4).
  cleanAudio: boolean;
  // Color grading: off, an automatic fix, or a look (each also corrects the video's own light).
  grade: "off" | "auto" | "bright" | "warm" | "soft";
  // Captions centered, or beside the speaker's head (left or right of frame).
  captionAlign: "center" | "left" | "right";
  // Captions can be switched off entirely (e.g. when only the hook should show).
  captionsOn: boolean;
  // Where the brand logo sits on the reel, if anywhere.
  logo: "off" | "top-left" | "top-right" | "bottom-right";
};

export type SavedLook = { id: string; name: string; style: ReelStyle };

// A recipe: the look (with speed, color grade, clean audio, zoom style…) plus what to add.
export type Recipe = {
  id: string;
  name: string;
  style: ReelStyle;
  // Add sound effects by moment, and have Claude suggest graphics, when it's applied.
  autoSounds: boolean;
  suggestGraphics: boolean;
  endCard: EndCard | null;
};

export type ColorRole = "primary" | "accent" | "background" | "text" | "extra";
export type BrandColor = { hex: string; name: string; role: ColorRole };

// How the brand sounds; used when Claude writes hooks, captions and slides.
export type BrandVoice = { tone: string[]; phrases: string[]; avoid: string[] };

export type BrandKit = {
  name: string;
  tagline: string;
  // False until the creator has built or entered their brand.
  setUp: boolean;
  palette: BrandColor[];
  // Headline (hooks, big words), body (captions), accent (handwritten touches).
  fonts: { headline: string; body: string; accent: string };
  logoAssetId: string;
  voice: BrandVoice;
  // The inspiration board the brand was built from, and why the brand fits it.
  inspiration: string[];
  story: string;
  business: BusinessProfile;
  defaultStyle: ReelStyle;
  looks: SavedLook[];
  // Saved recipes: a whole reel setup, applied to one or many reels in a tap.
  recipes: Recipe[];
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
  silences: { startMs: number; endMs: number }[];
  overlays: ResolvedOverlay[];
  hookSubText: string;
  sounds: (SoundCue & { src: string })[];
  music: (MusicBed & { src: string }) | null;
  // Fonts uploaded by the creator: family name and file URL.
  customFonts: { name: string; url: string }[];
  logoSrc: string;
  // Average color of the video, used by color grading.
  colorStats?: { r: number; g: number; b: number; luma: number; white?: { r: number; g: number; b: number } };
  endCard?: EndCard;
  // The pop as the end card lands (empty when sound effects are off).
  endCardSound?: string;
  // Key-click sounds for the typewriter hook (empty when sound effects are off).
  typingSounds?: string[];
};

export type AssetKind = "gif" | "image" | "video" | "audio" | "font";

// A GIF, image or b-roll clip in the creator's library, reusable across reels.
export type Asset = {
  id: string;
  name: string;
  kind: AssetKind;
  file: string;
  // Still image shown in the library for b-roll clips.
  thumb?: string;
  // "inspo": part of the brand inspiration board (kept out of the reel media library).
  collection?: "inspo";
  // File name it came from, when it was added from the broll folder (so it isn't added twice).
  source?: string;
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
  // Where it was dragged to (its center, as % of the frame). Overrides placement when set.
  x?: number;
  y?: number;
  // How an image or GIF is framed: a rounded card (default), tilted paper, a phone, a browser
  // window, or nothing (for see-through stickers).
  frame?: "card" | "paper" | "phone" | "browser" | "none";
  // A graphic drawn in the brand's style instead of a library item (assetId is then "").
  graphic?: ReelGraphic;
  // Suggested by Claude and waiting for Keep / Change / Drop (it still shows in the preview).
  suggested?: boolean;
  // Why Claude suggested it, shown on its card.
  why?: string;
  // A GIPHY GIF Claude suggested by search words; the creator picks the GIF (assetId is "" until then).
  gifQuery?: string;
};

// sticker: a tilted tag ("UNPOPULAR OPINION"). stat: a big number that counts up ("$800+")
// with a small label. cta: an Instagram-style "Comment EDIT" bubble.
// circle / arrow / underline: a hand-drawn mark that draws itself on (over a screenshot, say);
// overlay.size sets its width, color defaults to the key color.
// element: a brand shape (text holds its name: bolt, starburst, sparkle, heart, star).
export type ReelGraphic = { kind: "sticker" | "stat" | "cta" | "circle" | "arrow" | "underline" | "element"; text: string; sub?: string; color?: string };

// A short branded card after the last word, with the call to action.
export type EndCard = { on: boolean; text: string; sub: string };

// A sound effect that plays when a word is spoken. soundId is a built-in sound or a library item.
// A change the creator asked for at a moment in the reel (atMs is in finished-reel time).
export type ReelNote = { id: string; atMs: number; text: string };

export type SoundCue = { id: string; soundId: string; wordId: string; volume: number };

// Background music for the whole reel.
export type MusicBed = { soundId: string; volume: number; duck: boolean; enabled: boolean };

// An overlay ready to draw: the asset's details are included so the video doesn't need the library.
export type ResolvedOverlay = Overlay & { src: string; kind: AssetKind | "graphic"; width: number; height: number };

// One carousel slide or story frame made from a reel.
export type Slide = {
  id: string;
  kind: "cover" | "point" | "cta";
  eyebrow: string;
  title: string;
  body: string;
  pills: string[];
  // Which moment of the original video to use as the background (milliseconds)...
  frameMs: number;
  // ...unless a photo from the library is chosen instead.
  bgAssetId?: string;
};

// "photo": full-bleed photo; "framed": photo in a frame on your brand color; "clean": no photo,
// light brand background; "bold": no photo, your main color.
export type SlideDesign = "photo" | "framed" | "clean" | "bold";

export type SlideFormat = "carousel" | "stories";

export type SlideProps = {
  slide: Slide;
  format: SlideFormat;
  style: ReelStyle;
  design: SlideDesign;
  colors: { background: string; text: string; primary: string };
  background: string;
  customFonts: { name: string; url: string }[];
};

export type ProjectStatus = "uploaded" | "processing" | "ready" | "error";

export type RenderState = {
  status: "idle" | "rendering" | "done" | "error";
  progress: number;
  error?: string;
};

// Props for a b-roll trial reel: a few clips cut together with a big hook on top.
export type BrollReelProps = {
  clips: { src: string; durationMs: number }[];
  hookText: string;
  hookSubText: string;
  style: ReelStyle;
  lengthMs: number;
  music: (MusicBed & { src: string }) | null;
  customFonts: { name: string; url: string }[];
};

export type Project = {
  id: string;
  // "broll": a trial reel made from b-roll clips (no talking), with the info in the caption.
  kind?: "talking" | "broll";
  broll?: { clipIds: string[]; lengthMs: number };
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
  // Second, smaller line of the hook (used by the eyebrow and subhead layouts).
  hookSubText: string;
  postCaption: string;
  words: Word[];
  removePauses: boolean;
  // Quiet stretches detected in the audio, trimmed when removePauses is on.
  silences?: { startMs: number; endMs: number }[];
  overlays: Overlay[];
  sounds: SoundCue[];
  music: MusicBed | null;
  // Sound effects on/off for the whole reel.
  soundsEnabled: boolean;
  carousel: Slide[];
  stories: Slide[];
  slideDesign?: Partial<Record<SlideFormat, SlideDesign>>;
  style: ReelStyle;
  render: RenderState;
  // The moment of the original video used as the cover image.
  coverMs?: number;
  // Marked by the creator once it's been posted (moves it to the Posted folder).
  posted?: boolean;
  // Average color of the video (measured once), used by color grading.
  colorStats?: { r: number; g: number; b: number; luma: number; white?: { r: number; g: number; b: number } };
  // Branded closing card with the call to action.
  endCard?: EndCard;
  // The clean-audio copy of the video: being made, or ready.
  cleanAudio?: "working" | "ready" | "error";
  // "Notes on the draft": what to change at a moment of the finished reel, for Claude to apply.
  notes?: ReelNote[];
  // Set on trial reel versions: the reel they were made from and which angle they use.
  parentId?: string;
  variantLabel?: string;
};
