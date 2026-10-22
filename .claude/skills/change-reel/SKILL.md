---
name: change-reel
description: Make plain-words changes to a reel, e.g. "make it softer", "cut the first sentence", "hook lower", "captions one word at a time", "use my bold look", "add the laptop clip when I talk about clients". Use for any edit request about an existing reel.
---

# Change a reel

1. `npm run engine -- show <id|latest>` to see the words (numbered), hook, look and media.
2. Translate the request into edits, write them to `edits.json`, run
   `npm run engine -- apply <id> edits.json`. The editor updates live; tell them to look.
3. Confirm in one line what changed. If the request is ambiguous, make your best choice and
   mention the alternative ("I made it softer with a shadow instead of an outline; want serif key words too?").

## Edit format (all fields optional; word numbers come from `show`)
```json
{
  "hookText": "nobody's saying it, so i will",
  "hookSubText": "a smaller second line",
  "postCaption": "...",
  "removePauses": true,
  "keyWords": [3, 9, 14],
  "addKeyWords": [20], "removeKeyWords": [9],
  "cut": [0, 1, 2], "uncut": [2],
  "cutFillers": true,
  "emojis": {"9": "💰", "14": null},
  "fixWords": {"5": "Canva"},
  "look": "default",
  "style": {
    "font": "DM Sans", "displayFont": "Instrument Serif",
    "hookColor": "#FFFFFF", "hookPosition": "top|middle|bottom", "hookLayout": "headline|eyebrow|subhead", "hookDurationMs": 5000,
    "textColor": "#FFFFFF", "outlineColor": "#000000",
    "highlightColor": "#8656F6", "highlightTextColor": "#FFFFFF",
    "style": "pill|color|serif", "captionMode": "phrase|single", "textEffect": "shadow|outline",
    "position": "top|middle|bottom", "wordsPerLine": 4, "uppercase": false, "fontSize": 64, "zoomJumps": true, "captionAlign": "center|left|right"
  },
  "addMedia": [{"asset": "library item name", "fromWord": 10, "toWord": 14, "placement": "middle|top|bottom|full"}],
  "removeMedia": ["ov-..."],
  "addSounds": [{"sound": "Whoosh", "atWord": 0}, {"sound": "Pop", "atWord": 12}],
  "removeSounds": ["snd-..."],
  "soundsEnabled": true,
  "music": {"sound": "library sound name", "volume": 0.35, "duck": true}
}
```
`hookDurationMs: 0` keeps the hook on for the whole video. Hook layouts: `headline` (one big line),
`eyebrow` (small hookSubText above), `subhead` (small hookSubText below).
Starter sounds: Whoosh, Swoosh in, Swipe, Riser, Pop, Click, Blip, Typing, Keyboard clack, Camera shutter,
Notification, Ding, Cha-ching, Ta-da, Sparkle, Wrong buzz, Record scratch, Glitch, Boom, Kick, Heartbeat,
Tick tock (see src/shared/sounds.ts). Typing fits screenshots of texts/DMs; Cha-ching fits money;
Record scratch fits "but wait"; Notification fits DMs/comments.
Music must be a track they uploaded (they need the rights to it); `"music": null` removes it. `style: "pill"` = colored bubble behind
key words; `"color"` = key words change color; `"serif"` = key words in the hook font.

Fonts (any font works for captions or the hook; exact names matter): see `src/shared/fonts.ts`.
Clean: DM Sans, Inter, Montserrat, Poppins, Outfit, Lexend, Raleway, Anton, Bebas Neue...
Serif: "Instrument Serif (upright)", "Instrument Serif" (italic), "Playfair Display (upright)",
"Bodoni Moda (upright)", Fraunces, Abril Fatface... Script: Caveat, Dancing Script, Great Vibes...
Fonts they uploaded are listed by `library`.

Starter looks (in `src/shared/looks.ts`): Golden Hour, Side Note, Main Character, Hot Take,
Soft Launch, Clean Girl, Pop Star, Magazine, Notes App. To apply one, copy its style fields into "style".
`captionAlign: "left"|"right"` puts captions beside their head (with `position: "top"` = eye level).

## Making a look from a video they love
If they share a reel/video and say "make this a look": run `npm run engine -- frames <video path>`
to pull stills, look at them, and match font (closest in src/shared/fonts.ts), size, color,
key-word style, caption mode (one word vs phrase), placement (incl. left/right of head), hook
style and zoom. Save it as a named look with `npm run engine -- brand look.json` where look.json is
`{"addLook": {"name": "...", "style": {...full style...}}}`, then apply it to their reel.

## Translating common requests
- "softer / calmer": textEffect shadow, style serif or color, smaller fontSize (56-62), a softer
  displayFont (Instrument Serif, Fraunces).
- "bolder / louder": textEffect outline, style pill, captionMode single, fontSize 80+, Anton or Montserrat.
- "karaoke / one word at a time": captionMode single.
- "zoom in and out / punch-ins / make it more dynamic": zoomJumps true.
- "editorial / classy / screenshots on screen": Editorial starter look; put their
  screenshots on the lines they talk about with addMedia (placement middle, size ~0.6) and a Pop on each.
- "my brand colors": use `looks` to read their default look and saved looks; prefer those colors.
- "cut the first sentence": cut the word numbers up to and including its last word.
- "add <clip> when I talk about X": find the words in `show`, find the item with `library`, use addMedia.
- "add sound effects": a Whoosh on the first word (hook), a Pop where media appears, maybe a Ding on a
  big number or result. Keep them at least ~0.5s apart and don't overdo it.
- "save this as my default / as a look": use the `brand` command with
  `{"defaultStyle": {...}}`, or ask them to tap "Save this as a look" in the Visuals tab.

After a change they like, ask if they want it exported (`export`).
