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
    "style": "pill|color|serif", "captionMode": "phrase|single|karaoke", "textEffect": "shadow|outline",
    "position": "top|middle|bottom", "wordsPerLine": 4, "uppercase": false, "fontSize": 64, "zoomJumps": true, "captionAlign": "center|left|right",
    "captionsOn": true, "logo": "off|top-left|top-right|bottom-right"
  },
  "addMedia": [{"asset": "library item name", "fromWord": 10, "toWord": 14, "placement": "middle|top|bottom|full"}],
  "removeMedia": ["ov-..."],
  "addSounds": [{"sound": "Pop", "atWord": 12}, {"sound": "Cash register", "atWord": 30, "volume": 0.6}],
  "removeSounds": ["snd-..."],
  "soundsEnabled": true,
  "autoSounds": true,
  "music": {"sound": "library sound name", "volume": 0.35, "duck": true}
}
```
`hookDurationMs: 0` keeps the hook on for the whole video. Hook layouts: `headline` (one big line),
`eyebrow` (small hookSubText above), `subhead` (small hookSubText below).
Starter sounds are grouped by moment (see src/shared/sounds.ts):
- Text pop-ups (text or a key word pops on screen): Mouse click, Mouse click (double), Keyboard clicks, Keyboard typing
- Stickers & emojis (GIF, emoji, arrow, sticker): Pop (cartoon), Pop, Mobile select, Notification (chat)
- Screenshots & photos (screenshot, DM, comment, review, receipt, photo): Camera shutter 2, Camera shutter, Item pickup (gaming)
- Money moments (price, sale, savings, income, $): Cash register, Coin collect (gaming), Coins clinking
- Transitions: Whoosh, Swoosh in, Swipe, Riser. Reactions: Blip, Notification, Ding, Ta-da, Sparkle,
  Wrong buzz, Record scratch ("but wait"), Glitch. Impacts: Boom, Kick, Heartbeat, Tick tock.
`"autoSounds": true` places sounds by those moment rules (and runs after the other changes in the same file).
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
- "one word at a time": captionMode single. "karaoke": captionMode karaoke (whole phrase, words light up).
- "no captions": captionsOn false. "add my logo": logo top-right (needs a logo in the brand kit).
- "zoom in and out / punch-ins / make it more dynamic": zoomJumps true.
- "editorial / classy / screenshots on screen": Editorial starter look; put their
  screenshots on the lines they talk about with addMedia (placement middle, size ~0.6) and a Pop on each.
- "my brand colors": use `looks` to read their default look and saved looks; prefer those colors.
- "cut the first sentence": cut the word numbers up to and including its last word.
- "add <clip> when I talk about X": find the words in `show`, find the item with `library`, use addMedia.
- "it still has pauses" / "cut the dead air" / "tighter": run `npm run engine -- tighten <id>`. It
  listens to the audio again and cuts every pause, um and restart.
- "the sounds are too loud": lower the cue volumes (`removeSounds` then `addSounds` with `"volume": 0.3`).
  Effects are already mixed well under the voice; avoid sounds on the very first word.
- "move the hook lower / to the left", "put the GIF by my head": positions are % of the frame
  (x across, y down; 50/50 is the center; Instagram covers roughly the bottom 20% and the right
  edge). Hook: `"style": {"hookPlace": {"x": 50, "y": 30}}` (`null` goes back to top/middle/bottom).
  Media: `"moveMedia": {"ov-…": {"x": 70, "y": 35}}`. They can also drag them with "✥ Move" above the preview.
- "add sound effects": use `"autoSounds": true`, then `show` and tweak with addSounds/removeSounds if
  a moment it missed needs one. Keep them at least ~0.5s apart and don't overdo it.
- "save this as my default / as a look": use the `brand` command with
  `{"defaultStyle": {...}}`, or ask them to tap "Save this as a look" in the Visuals tab.

After a change they like, ask if they want it exported (`export`).
