// Starter sound effects that ship with the engine (made for this project, free to use).
// Grouped by the moment they're for, the way popular editors pick sounds:
// text popping up, a sticker or emoji, a screenshot or photo, talking about money.
export const BUILTIN_SOUNDS = [
  { id: "sfx-click", name: "Mouse click", file: "click.mp3", group: "Text pop-ups", tags: "ui tap button mouse single" },
  { id: "sfx-mouse-double", name: "Mouse click (double)", file: "mouse-double.mp3", group: "Text pop-ups", tags: "mouse double click ui" },
  { id: "sfx-keyboard", name: "Keyboard clicks", file: "keyboard.mp3", group: "Text pop-ups", tags: "keyboard key enter clack" },
  { id: "sfx-typing", name: "Keyboard typing", file: "typing.mp3", group: "Text pop-ups", tags: "keyboard typing laptop text" },
  { id: "sfx-pop-cartoon", name: "Pop (cartoon)", file: "pop-cartoon.mp3", group: "Stickers & emojis", tags: "pop bubble cartoon sticker emoji gif" },
  { id: "sfx-pop", name: "Pop", file: "pop.mp3", group: "Stickers & emojis", tags: "bubble appear text" },
  { id: "sfx-mobile-select", name: "Mobile select", file: "mobile-select.mp3", group: "Stickers & emojis", tags: "phone tap select arrow sticker" },
  { id: "sfx-chat-bubble", name: "Notification (chat)", file: "chat-bubble.mp3", group: "Stickers & emojis", tags: "chat message dm bubble notification" },
  { id: "sfx-shutter-2", name: "Camera shutter 2", file: "shutter-2.mp3", group: "Screenshots & photos", tags: "photo snap screenshot camera" },
  { id: "sfx-shutter", name: "Camera shutter", file: "shutter.mp3", group: "Screenshots & photos", tags: "photo snap screenshot camera" },
  { id: "sfx-marker", name: "Marker scribble", file: "marker.mp3", group: "Screenshots & photos", tags: "marker pen circle draw underline arrow" },
  { id: "sfx-item-pickup", name: "Item pickup (gaming)", file: "item-pickup.mp3", group: "Screenshots & photos", tags: "game pickup review receipt dm" },
  { id: "sfx-cha-ching", name: "Cash register", file: "cha-ching.mp3", group: "Money moments", tags: "money cash register sale cha-ching" },
  { id: "sfx-coin-collect", name: "Coin collect (gaming)", file: "coin-collect.mp3", group: "Money moments", tags: "coin game money income" },
  { id: "sfx-coins-clinking", name: "Coins clinking", file: "coins-clinking.mp3", group: "Money moments", tags: "coins money savings price" },
  { id: "sfx-whoosh", name: "Whoosh", file: "whoosh.mp3", group: "Transitions", tags: "transition swoosh air" },
  { id: "sfx-swoosh-in", name: "Swoosh in", file: "swoosh-in.mp3", group: "Transitions", tags: "transition reverse build" },
  { id: "sfx-swipe", name: "Swipe", file: "swipe.mp3", group: "Transitions", tags: "swipe slide transition" },
  { id: "sfx-riser", name: "Riser", file: "riser.mp3", group: "Transitions", tags: "build tension transition" },
  { id: "sfx-blip", name: "Blip", file: "blip.mp3", group: "Reactions", tags: "ui soft" },
  { id: "sfx-notification", name: "Notification", file: "notification.mp3", group: "Reactions", tags: "phone ping message dm" },
  { id: "sfx-ding", name: "Ding", file: "ding.mp3", group: "Reactions", tags: "bell correct success" },
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

export const SOUND_GROUPS = ["Text pop-ups", "Stickers & emojis", "Screenshots & photos", "Money moments", "Transitions", "Reactions", "Impacts"] as const;

// When to use each group, shown in the sound picker.
export const SOUND_GROUP_HINTS: Record<(typeof SOUND_GROUPS)[number], string> = {
  "Text pop-ups": "When text, a word or a phrase pops onto the screen.",
  "Stickers & emojis": "When you add a GIF, emoji, arrow, sticker or other visual.",
  "Screenshots & photos": "When a screenshot, DM, comment, review, receipt or photo appears.",
  "Money moments": "Talking about a price, sale, savings, income or anything $$$.",
  Transitions: "Between ideas, or as the hook lands.",
  Reactions: "A win, a plot twist, or a mistake.",
  Impacts: "Big reveals and dramatic beats.",
};

export const builtinSound = (id: string) => BUILTIN_SOUNDS.find((s) => s.id === id);
