// Starter sound effects that ship with the engine (made for this project, free to use).
export const BUILTIN_SOUNDS = [
  { id: "sfx-whoosh", name: "Whoosh", file: "whoosh.mp3", group: "Transitions", tags: "transition swoosh air" },
  { id: "sfx-swoosh-in", name: "Swoosh in", file: "swoosh-in.mp3", group: "Transitions", tags: "transition reverse build" },
  { id: "sfx-swipe", name: "Swipe", file: "swipe.mp3", group: "Transitions", tags: "swipe slide transition" },
  { id: "sfx-riser", name: "Riser", file: "riser.mp3", group: "Transitions", tags: "build tension transition" },
  { id: "sfx-pop", name: "Pop", file: "pop.mp3", group: "Pops & clicks", tags: "bubble appear text" },
  { id: "sfx-click", name: "Click", file: "click.mp3", group: "Pops & clicks", tags: "ui tap button mouse" },
  { id: "sfx-blip", name: "Blip", file: "blip.mp3", group: "Pops & clicks", tags: "ui soft" },
  { id: "sfx-typing", name: "Typing", file: "typing.mp3", group: "Pops & clicks", tags: "keyboard typing laptop text" },
  { id: "sfx-keyboard", name: "Keyboard clack", file: "keyboard.mp3", group: "Pops & clicks", tags: "keyboard key enter" },
  { id: "sfx-shutter", name: "Camera shutter", file: "shutter.mp3", group: "Pops & clicks", tags: "photo snap screenshot" },
  { id: "sfx-notification", name: "Notification", file: "notification.mp3", group: "Reactions", tags: "phone ping message dm" },
  { id: "sfx-ding", name: "Ding", file: "ding.mp3", group: "Reactions", tags: "bell correct success" },
  { id: "sfx-cha-ching", name: "Cha-ching", file: "cha-ching.mp3", group: "Reactions", tags: "money cash register sale" },
  { id: "sfx-ta-da", name: "Ta-da", file: "ta-da.mp3", group: "Reactions", tags: "reveal win celebrate" },
  { id: "sfx-sparkle", name: "Sparkle", file: "sparkle.mp3", group: "Reactions", tags: "magic shine chime" },
  { id: "sfx-wrong", name: "Wrong buzz", file: "wrong-buzz.mp3", group: "Reactions", tags: "error no fail mistake" },
  { id: "sfx-record-scratch", name: "Record scratch", file: "record-scratch.mp3", group: "Reactions", tags: "wait stop plot twist" },
  { id: "sfx-glitch", name: "Glitch", file: "glitch.mp3", group: "Reactions", tags: "glitch digital error" },
  { id: "sfx-boom", name: "Boom", file: "boom.mp3", group: "Impacts", tags: "impact hit bass drop" },
  { id: "sfx-kick", name: "Kick", file: "kick.mp3", group: "Impacts", tags: "drum beat hit punch" },
  { id: "sfx-heartbeat", name: "Heartbeat", file: "heartbeat.mp3", group: "Impacts", tags: "tension suspense" },
  { id: "sfx-tick-tock", name: "Tick tock", file: "tick-tock.mp3", group: "Impacts", tags: "clock time waiting deadline" },
] as const;

export const SOUND_GROUPS = ["Transitions", "Pops & clicks", "Reactions", "Impacts"] as const;

export const builtinSound = (id: string) => BUILTIN_SOUNDS.find((s) => s.id === id);
