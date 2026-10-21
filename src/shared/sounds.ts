// Starter sound effects that ship with the engine (made for this project, free to use).
export const BUILTIN_SOUNDS = [
  { id: "sfx-whoosh", name: "Whoosh", file: "whoosh.mp3", tags: "transition swoosh air" },
  { id: "sfx-swoosh-in", name: "Swoosh in", file: "swoosh-in.mp3", tags: "transition reverse build" },
  { id: "sfx-pop", name: "Pop", file: "pop.mp3", tags: "bubble appear text" },
  { id: "sfx-click", name: "Click", file: "click.mp3", tags: "ui tap button mouse" },
  { id: "sfx-blip", name: "Blip", file: "blip.mp3", tags: "ui notification soft" },
  { id: "sfx-ding", name: "Ding", file: "ding.mp3", tags: "bell correct success" },
  { id: "sfx-sparkle", name: "Sparkle", file: "sparkle.mp3", tags: "magic shine chime" },
  { id: "sfx-riser", name: "Riser", file: "riser.mp3", tags: "build tension transition" },
  { id: "sfx-boom", name: "Boom", file: "boom.mp3", tags: "impact hit bass drop" },
  { id: "sfx-shutter", name: "Camera shutter", file: "shutter.mp3", tags: "photo snap" },
] as const;

export const builtinSound = (id: string) => BUILTIN_SOUNDS.find((s) => s.id === id);
